const trailingUrlPunctuation = /[.,;:!?)\]}'"”’>]+$/;

/**
 * Returns the first HTTP(S) URL that appears in the message. Trailing
 * punctuation is removed so a URL at the end of a sentence is still usable.
 */
export const extractSourceUrl = (rawText: string): string | null => {
  const urlPattern = /\bhttps?:\/\/[^\s<>"'`]+/gi;

  for (const match of rawText.matchAll(urlPattern)) {
    const candidate = match[0].replace(trailingUrlPunctuation, '');

    if (!URL.canParse(candidate)) {
      continue;
    }

    const protocol = new URL(candidate).protocol;

    if (protocol === 'http:' || protocol === 'https:') {
      return candidate;
    }
  }

  return null;
};
