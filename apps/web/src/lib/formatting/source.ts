export type SourceReference = { sourceName: string | null; sourceUrl: string | null };

export const getSourceHost = (sourceUrl: string | null): string | null => {
  if (sourceUrl === null) return null;
  try {
    return new URL(sourceUrl).hostname.replace(/^www\./, '') || null;
  } catch {
    return null;
  }
};

export const getSourceName = (item: SourceReference): string | null => {
  if (item.sourceName?.trim()) return item.sourceName.trim();
  const host = getSourceHost(item.sourceUrl);
  if (host === null) return null;
  const platforms: Record<string, string> = {
    'youtube.com': 'YouTube',
    'youtu.be': 'YouTube',
    'instagram.com': 'Instagram',
    'facebook.com': 'Facebook',
    'tiktok.com': 'TikTok',
    'x.com': 'X',
    'twitter.com': 'X',
    'github.com': 'GitHub',
    'linkedin.com': 'LinkedIn',
    'reddit.com': 'Reddit',
  };
  return Object.entries(platforms).find(([domain]) => host === domain || host.endsWith(`.${domain}`))?.[1] ?? host;
};

export const getSafeSourceUrl = (sourceUrl: string | null): string | null => {
  if (!sourceUrl) return null;
  try {
    return ['http:', 'https:'].includes(new URL(sourceUrl).protocol) ? sourceUrl : null;
  } catch {
    return null;
  }
};
