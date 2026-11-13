import { lookup } from 'node:dns/promises';
import { z } from 'zod';
import { appLogger } from '../logging/logger';
import type { LinkMetadata, LinkMetadataDependencies } from './link-metadata.types';

const requestTimeoutMs = 4_000;
const maximumRedirects = 3;
const maximumHtmlCharacters = 512 * 1024;
const headEndTag = '</head>';
const maximumTitleLength = 300;
const maximumDescriptionLength = 1_000;
const maximumSiteNameLength = 200;
const maximumAuthorLength = 200;
const maximumTypeLength = 100;

const oEmbedSchema = z.object({
  title: z.string().min(1),
  author_name: z.string().optional(),
  provider_name: z.string().optional(),
});

const youtubeHosts = new Set([
  'm.youtube.com',
  'music.youtube.com',
  'www.youtube.com',
  'www.youtu.be',
  'youtu.be',
  'youtube.com',
]);

const redirectStatusCodes = new Set([301, 302, 303, 307, 308]);

const cleanText = (value: string | null | undefined, maximumLength: number): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  const cleaned = value.replace(/\s+/g, ' ').trim();

  return cleaned.length === 0 ? null : cleaned.slice(0, maximumLength);
};

const isPrivateIpv4 = (address: string): boolean => {
  const parts = address.split('.').map(Number);

  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }

  const [first = 0, second = 0, third = 0] = parts;

  if (first === 0 || first === 10 || first === 127) {
    return true;
  }

  if (first === 169 && second === 254) {
    return true;
  }

  if (first === 172 && second >= 16 && second <= 31) {
    return true;
  }

  if (first === 192 && second === 168) {
    return true;
  }

  if (first === 192 && second === 0 && (third === 0 || third === 2)) {
    return true;
  }

  if (first === 100 && second >= 64 && second <= 127) {
    return true;
  }

  if (first === 198 && (second === 18 || second === 19)) {
    return true;
  }

  return first >= 224;
};

const isPrivateAddress = (address: string): boolean => {
  const normalized = address.toLowerCase();
  const mappedIpv4 = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(normalized);

  if (mappedIpv4?.[1] !== undefined) {
    return isPrivateIpv4(mappedIpv4[1]);
  }

  if (normalized.includes(':')) {
    return (
      normalized === '::' ||
      normalized === '::1' ||
      normalized.startsWith('fc') ||
      normalized.startsWith('fd') ||
      normalized.startsWith('fe8') ||
      normalized.startsWith('fe9') ||
      normalized.startsWith('fea') ||
      normalized.startsWith('feb')
    );
  }

  return isPrivateIpv4(normalized);
};

const isIpLiteral = (hostname: string): boolean => /\d+\.\d+\.\d+\.\d+/.test(hostname) || hostname.includes(':');

const defaultLookupHost = async (hostname: string): Promise<string[]> => {
  try {
    const records = await lookup(hostname, { all: true, verbatim: true });

    return records.map((record) => record.address);
  } catch {
    return [];
  }
};

const isAllowedUrl = async (url: URL, lookupHost: (hostname: string) => Promise<string[]>): Promise<boolean> => {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return false;
  }

  if (url.username !== '' || url.password !== '') {
    return false;
  }

  const defaultPort = url.protocol === 'https:' ? 443 : 80;
  const port = url.port === '' ? defaultPort : Number(url.port);

  if (port !== 80 && port !== 443) {
    return false;
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  const isBlockedHostname =
    hostname.length === 0 ||
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal');

  if (isBlockedHostname) {
    return false;
  }

  const addresses = isIpLiteral(hostname) ? [hostname] : await lookupHost(hostname);

  return addresses.length > 0 && addresses.every((address) => !isPrivateAddress(address));
};

const readHtmlHead = async (response: Response, limit: number): Promise<string> => {
  if (response.body === null) {
    return '';
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let html = '';
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    totalBytes += value.byteLength;
    html += decoder.decode(value, { stream: true });

    const headEnd = html.toLowerCase().indexOf(headEndTag);

    if (headEnd !== -1) {
      await reader.cancel().catch(() => undefined);

      return html.slice(0, headEnd + headEndTag.length);
    }

    // Stop early for pages without a closing head tag instead of buffering the whole document.
    if (html.length > limit || totalBytes > limit * 4) {
      await reader.cancel().catch(() => undefined);

      return html.slice(0, limit);
    }
  }

  return html + decoder.decode();
};

const fetchYouTubeMetadata = async (
  url: URL,
  fetchImplementation: NonNullable<LinkMetadataDependencies['fetch']>,
): Promise<LinkMetadata | null> => {
  const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(url.toString())}&format=json`;

  let response: Response;

  try {
    response = await fetchImplementation(endpoint, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    return null;
  }

  const parsed = oEmbedSchema.safeParse(payload);

  if (!parsed.success) {
    return null;
  }

  return {
    url: url.toString(),
    title: cleanText(parsed.data.title, maximumTitleLength),
    description: null,
    site_name: cleanText(parsed.data.provider_name ?? 'YouTube', maximumSiteNameLength),
    author: cleanText(parsed.data.author_name, maximumAuthorLength),
    type: 'video',
  };
};

type HtmlFacts = {
  author: string | null;
  description: string | null;
  siteName: string | null;
  title: string | null;
  type: string | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readString = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }

  return null;
};

const flattenJsonLd = (value: unknown): unknown[] => {
  if (Array.isArray(value)) {
    return value.flatMap(flattenJsonLd);
  }

  if (!isRecord(value)) {
    return [];
  }

  const graph = value['@graph'];

  if (graph !== undefined) {
    return flattenJsonLd(graph);
  }

  return [value];
};

const readJsonLdAuthor = (value: unknown): string | null => {
  const direct = readString(value);

  if (direct !== null) {
    return direct;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const author = readJsonLdAuthor(entry);

      if (author !== null) {
        return author;
      }
    }

    return null;
  }

  if (isRecord(value)) {
    return readString(value.name);
  }

  return null;
};

const readJsonLdSiteName = (value: unknown): string | null => {
  if (isRecord(value)) {
    const publisher = value.publisher;
    const partOf = value.isPartOf;
    const publisherName = isRecord(publisher) ? readString(publisher.name) : readString(publisher);
    const partOfName = isRecord(partOf) ? readString(partOf.name) : readString(partOf);

    return publisherName ?? partOfName ?? null;
  }

  return null;
};

const mapJsonLdType = (value: unknown): string | null => {
  const rawType = Array.isArray(value) ? value.find((entry) => typeof entry === 'string') : value;

  if (typeof rawType !== 'string') {
    return null;
  }

  const normalized = rawType.toLowerCase();

  if (normalized.includes('article') || normalized === 'blogposting' || normalized === 'webpage') {
    return 'article';
  }

  if (normalized.includes('video')) {
    return 'video';
  }

  if (normalized.includes('music') || normalized.includes('audio')) {
    return 'music';
  }

  if (normalized.includes('image')) {
    return 'image';
  }

  return null;
};

const isContentJsonLdEntry = (entry: Record<string, unknown>): boolean => {
  const rawTypes = Array.isArray(entry['@type']) ? entry['@type'] : [entry['@type']];

  return rawTypes.some(
    (rawType) =>
      typeof rawType === 'string' &&
      /article|video|music|audio|image|product|recipe|book|podcast|episode|movie|tvseries/i.test(rawType),
  );
};

const readJsonLdFacts = (scripts: string[]): HtmlFacts => {
  const emptyFacts: HtmlFacts = {
    author: null,
    description: null,
    siteName: null,
    title: null,
    type: null,
  };
  let fallback: HtmlFacts | null = null;

  for (const script of scripts) {
    let parsed: unknown;

    try {
      parsed = JSON.parse(script);
    } catch {
      continue;
    }

    for (const entry of flattenJsonLd(parsed)) {
      if (!isRecord(entry)) {
        continue;
      }

      const headline = readString(entry.headline);
      const description = readString(entry.description);
      const title = headline ?? readString(entry.name);

      if (title === null && description === null) {
        continue;
      }

      const facts: HtmlFacts = {
        author: readJsonLdAuthor(entry.author),
        description,
        siteName: readJsonLdSiteName(entry),
        title,
        type: mapJsonLdType(entry['@type']),
      };

      if (isContentJsonLdEntry(entry)) {
        return facts;
      }

      // Keep a plain WebPage/Organization entry only when it carries real descriptive data.
      if (fallback === null && (headline !== null || description !== null)) {
        fallback = facts;
      }
    }
  }

  return fallback ?? emptyFacts;
};

const maximumJsonLdLength = 100_000;

const readHtmlFacts = async (html: string): Promise<HtmlFacts> => {
  const metaValues = new Map<string, string>();
  const jsonLdScripts: string[] = [];
  let activeJsonLd: string | null = null;
  let titleText = '';

  const finishJsonLd = () => {
    if (activeJsonLd !== null) {
      jsonLdScripts.push(activeJsonLd);
      activeJsonLd = null;
    }
  };

  const rewriter = new HTMLRewriter()
    .on('title', {
      text(chunk) {
        if (titleText.length < maximumTitleLength) {
          titleText += chunk.text;
        }
      },
    })
    .on('meta', {
      element(element) {
        const key = (element.getAttribute('property') ?? element.getAttribute('name') ?? '').toLowerCase();
        const content = element.getAttribute('content');

        if (key !== '' && content !== null && !metaValues.has(key)) {
          metaValues.set(key, content);
        }
      },
    })
    .on('script[type="application/ld+json"]', {
      element() {
        finishJsonLd();
        activeJsonLd = '';
      },
      text(chunk) {
        if (activeJsonLd !== null && activeJsonLd.length < maximumJsonLdLength) {
          activeJsonLd += chunk.text;
        }
      },
    });

  await rewriter.transform(new Response(html)).text();
  finishJsonLd();

  const pick = (...keys: string[]): string | null => {
    for (const key of keys) {
      const value = metaValues.get(key);

      if (value !== undefined) {
        return value;
      }
    }

    return null;
  };

  const jsonLdFacts = readJsonLdFacts(jsonLdScripts);

  return {
    author: pick('author', 'article:author') ?? jsonLdFacts.author,
    description: pick('og:description', 'twitter:description', 'description') ?? jsonLdFacts.description,
    siteName: pick('og:site_name', 'application-name') ?? jsonLdFacts.siteName,
    title: pick('og:title', 'twitter:title') ?? jsonLdFacts.title ?? (titleText.length === 0 ? null : titleText),
    type: pick('og:type') ?? jsonLdFacts.type,
  };
};

const fetchHtmlMetadata = async (url: URL, response: Response): Promise<LinkMetadata | null> => {
  const contentType = response.headers.get('content-type') ?? '';
  const isHtml = contentType.includes('text/html') || contentType.includes('application/xhtml+xml');

  if (!isHtml) {
    return null;
  }

  const html = await readHtmlHead(response, maximumHtmlCharacters);
  const facts = await readHtmlFacts(html);

  return {
    url: url.toString(),
    title: cleanText(facts.title, maximumTitleLength),
    description: cleanText(facts.description, maximumDescriptionLength),
    site_name: cleanText(facts.siteName, maximumSiteNameLength),
    author: cleanText(facts.author, maximumAuthorLength),
    type: cleanText(facts.type, maximumTypeLength),
  };
};

const requestPage = async (
  initialUrl: URL,
  fetchImplementation: NonNullable<LinkMetadataDependencies['fetch']>,
  lookupHost: (hostname: string) => Promise<string[]>,
): Promise<{ response: Response; url: URL } | null> => {
  const deadline = Date.now() + requestTimeoutMs;
  let currentUrl = initialUrl;

  for (let redirectCount = 0; redirectCount <= maximumRedirects; redirectCount += 1) {
    if (!(await isAllowedUrl(currentUrl, lookupHost))) {
      return null;
    }

    const remainingMs = deadline - Date.now();

    if (remainingMs <= 0) {
      return null;
    }

    let response: Response;

    try {
      response = await fetchImplementation(currentUrl.toString(), {
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          'User-Agent': 'HermesJunkPreview/1.0',
        },
        redirect: 'manual',
        signal: AbortSignal.timeout(remainingMs),
      });
    } catch {
      return null;
    }

    if (!redirectStatusCodes.has(response.status)) {
      return { response, url: currentUrl };
    }

    const location = response.headers.get('location');

    if (location === null) {
      return null;
    }

    try {
      currentUrl = new URL(location, currentUrl);
    } catch {
      return null;
    }
  }

  return null;
};

export const fetchLinkMetadata = async (
  rawUrl: string,
  dependencies: LinkMetadataDependencies = {},
): Promise<LinkMetadata | null> => {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  const fetchImplementation = dependencies.fetch ?? ((input, init) => fetch(input, init));
  const lookupHost = dependencies.lookupHost ?? defaultLookupHost;

  try {
    if (youtubeHosts.has(url.hostname.toLowerCase())) {
      return await fetchYouTubeMetadata(url, fetchImplementation);
    }

    const page = await requestPage(url, fetchImplementation, lookupHost);

    if (page === null) {
      return null;
    }

    return await fetchHtmlMetadata(url, page.response);
  } catch (error) {
    appLogger.debug('Link metadata unavailable: {reason} [url={url}]', {
      reason: error instanceof Error ? error.name : 'unknown',
      url: url.toString(),
    });

    return null;
  }
};
