/**
 * Counts the number of words in a given text.
 *
 * @param text - The input text to count words from.
 * @returns The number of words in the text.
 */
export const countWords = (text: string): number => {
  return text.trim().split(/\s+/).filter(Boolean).length;
};
