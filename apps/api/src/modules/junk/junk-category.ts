import { normalizeTaxonomyValue } from '../../shared/text/taxonomy';

/**
 * Category values shared with the Telegram/Hermes Junk flow. The value describes
 * the format of an item, not its topic, so both capture paths stay searchable.
 */
export const junkCategorySuggestions = [
  'article',
  'image',
  'meme',
  'music',
  'quote',
  'reference',
  'tool',
  'video',
] as const;

type JunkCategorySuggestion = (typeof junkCategorySuggestions)[number];

const categoryAliases: Record<string, JunkCategorySuggestion> = {
  alat: 'tool',
  artikel: 'article',
  articles: 'article',
  berita: 'article',
  foto: 'image',
  gambar: 'image',
  images: 'image',
  kutipan: 'quote',
  lagu: 'music',
  memes: 'meme',
  musik: 'music',
  quotes: 'quote',
  referensi: 'reference',
  references: 'reference',
  rujukan: 'reference',
  tools: 'tool',
  videos: 'video',
};

const canonicalCategories = new Set<string>(junkCategorySuggestions);

/**
 * Maps an AI-suggested category onto the shared vocabulary, an existing archive
 * category, or a normalized new value when nothing fits.
 */
export const normalizeJunkCategory = (candidate: string, existingCategories: string[]): string => {
  const normalized = normalizeTaxonomyValue(candidate);
  const aliased = categoryAliases[normalized];

  if (aliased !== undefined) {
    return aliased;
  }

  if (canonicalCategories.has(normalized)) {
    return normalized;
  }

  const existing = existingCategories.find((category) => normalizeTaxonomyValue(category) === normalized);

  return existing === undefined ? normalized : normalizeTaxonomyValue(existing);
};
