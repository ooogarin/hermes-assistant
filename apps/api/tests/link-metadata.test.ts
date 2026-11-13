import { expect, test } from 'bun:test';
import { fetchLinkMetadata } from '../src/core/link/link-metadata';

const publicLookupHost = async (): Promise<string[]> => ['93.184.216.34'];

const htmlResponse = (html: string): Response =>
  new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });

test('reads YouTube facts from the oEmbed endpoint', async () => {
  const requestedUrls: string[] = [];
  const metadata = await fetchLinkMetadata('https://www.youtube.com/watch?v=abc', {
    fetch: async (input) => {
      requestedUrls.push(input);

      return Response.json({
        title: 'Nadin Amizah - Sorai (Official Music Video)',
        author_name: 'Nadin Amizah',
        provider_name: 'YouTube',
      });
    },
    lookupHost: publicLookupHost,
  });

  expect(requestedUrls[0]).toStartWith('https://www.youtube.com/oembed?url=');
  expect(metadata).toEqual({
    url: 'https://www.youtube.com/watch?v=abc',
    title: 'Nadin Amizah - Sorai (Official Music Video)',
    description: null,
    site_name: 'YouTube',
    author: 'Nadin Amizah',
    type: 'video',
  });
});

test('returns null when the YouTube oEmbed request fails', async () => {
  const metadata = await fetchLinkMetadata('https://youtu.be/abc', {
    fetch: async () => new Response('blocked', { status: 403 }),
    lookupHost: publicLookupHost,
  });

  expect(metadata).toBeNull();
});

test('reads OpenGraph and meta facts from an HTML page', async () => {
  const html = [
    '<!doctype html><html><head>',
    '<title>Fallback browser title</title>',
    '<meta property="og:title" content="Understanding Rust Ownership">',
    '<meta property="og:description" content="A guide to ownership and borrowing in Rust.">',
    '<meta property="og:site_name" content="Example Blog">',
    '<meta property="og:type" content="article">',
    '<meta name="author" content="Jane Doe">',
    '</head><body></body></html>',
  ].join('');
  const metadata = await fetchLinkMetadata('https://example.com/rust-ownership', {
    fetch: async () => htmlResponse(html),
    lookupHost: publicLookupHost,
  });

  expect(metadata).toEqual({
    url: 'https://example.com/rust-ownership',
    title: 'Understanding Rust Ownership',
    description: 'A guide to ownership and borrowing in Rust.',
    site_name: 'Example Blog',
    author: 'Jane Doe',
    type: 'article',
  });
});

test('falls back to the title element and description meta tag', async () => {
  const html =
    '<html><head><title>  Only a title  </title><meta name="description" content="Plain description."></head></html>';
  const metadata = await fetchLinkMetadata('https://example.com/plain', {
    fetch: async () => htmlResponse(html),
    lookupHost: publicLookupHost,
  });

  expect(metadata).toMatchObject({
    title: 'Only a title',
    description: 'Plain description.',
    site_name: null,
    author: null,
    type: null,
  });
});

test('falls back to JSON-LD for pages without OpenGraph tags', async () => {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', name: 'Contoh Media' },
      {
        '@type': 'NewsArticle',
        headline: 'Judul berita dari JSON-LD',
        description: 'Ringkasan berita dari JSON-LD.',
        author: { '@type': 'Person', name: 'Wartawan Contoh' },
        publisher: { '@type': 'Organization', name: 'Contoh Media' },
      },
    ],
  };
  const html = `<html><head><script type="application/ld+json">${JSON.stringify(jsonLd)}</script></head><body></body></html>`;
  const metadata = await fetchLinkMetadata('https://news.example.com/article', {
    fetch: async () => htmlResponse(html),
    lookupHost: publicLookupHost,
  });

  expect(metadata).toEqual({
    url: 'https://news.example.com/article',
    title: 'Judul berita dari JSON-LD',
    description: 'Ringkasan berita dari JSON-LD.',
    site_name: 'Contoh Media',
    author: 'Wartawan Contoh',
    type: 'article',
  });
});

test('ignores invalid JSON-LD and keeps the HTML title fallback', async () => {
  const html =
    '<html><head><title>Judul HTML</title><script type="application/ld+json">{not json}</script></head></html>';
  const metadata = await fetchLinkMetadata('https://example.com/broken', {
    fetch: async () => htmlResponse(html),
    lookupHost: publicLookupHost,
  });

  expect(metadata).toMatchObject({ title: 'Judul HTML' });
});

test('reads metadata from the head of a large page without downloading the body', async () => {
  const head =
    '<html><head><meta property="og:title" content="Judul Halaman Besar"><meta property="og:type" content="article"></head>';
  const html = `${head}<body>${'x'.repeat(1_500_000)}</body></html>`;
  const metadata = await fetchLinkMetadata('https://example.com/large', {
    fetch: async () => htmlResponse(html),
    lookupHost: publicLookupHost,
  });

  expect(metadata).toMatchObject({ title: 'Judul Halaman Besar', type: 'article' });
});

test('ignores responses that are not HTML', async () => {
  const metadata = await fetchLinkMetadata('https://example.com/file.pdf', {
    fetch: async () => new Response('%PDF-1.7', { headers: { 'Content-Type': 'application/pdf' } }),
    lookupHost: publicLookupHost,
  });

  expect(metadata).toBeNull();
});

test('refuses private and loopback hosts without making a request', async () => {
  const blockedUrls = [
    'http://127.0.0.1/admin',
    'http://localhost:3000/',
    'http://10.0.0.5/',
    'http://169.254.169.254/',
  ];

  for (const blockedUrl of blockedUrls) {
    let requested = false;

    const metadata = await fetchLinkMetadata(blockedUrl, {
      fetch: async () => {
        requested = true;

        return htmlResponse('<html><title>Should not load</title></html>');
      },
      lookupHost: publicLookupHost,
    });

    expect(metadata).toBeNull();
    expect(requested).toBe(false);
  }
});

test('refuses a public hostname that resolves to a private address', async () => {
  let requested = false;

  const metadata = await fetchLinkMetadata('https://internal.example.com/report', {
    fetch: async () => {
      requested = true;

      return htmlResponse('<html><title>Should not load</title></html>');
    },
    lookupHost: async () => ['10.1.2.3'],
  });

  expect(metadata).toBeNull();
  expect(requested).toBe(false);
});

test('refuses a redirect that points at a private address', async () => {
  const requestedUrls: string[] = [];

  const metadata = await fetchLinkMetadata('https://example.com/redirect', {
    fetch: async (input) => {
      requestedUrls.push(input);

      return new Response(null, { status: 302, headers: { Location: 'http://127.0.0.1/secret' } });
    },
    lookupHost: publicLookupHost,
  });

  expect(metadata).toBeNull();
  expect(requestedUrls).toHaveLength(1);
});

test('fails open when the network request throws', async () => {
  const metadata = await fetchLinkMetadata('https://example.com/slow', {
    fetch: async () => {
      throw new DOMException('The operation timed out.', 'TimeoutError');
    },
    lookupHost: publicLookupHost,
  });

  expect(metadata).toBeNull();
});

test('rejects non-HTTP URLs and URLs with credentials', async () => {
  for (const rawUrl of ['ftp://example.com/file', 'https://user:secret@example.com/page', 'not a URL']) {
    const metadata = await fetchLinkMetadata(rawUrl, {
      fetch: async () => htmlResponse('<html><title>Should not load</title></html>'),
      lookupHost: publicLookupHost,
    });

    expect(metadata).toBeNull();
  }
});
