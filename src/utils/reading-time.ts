/**
 * Reading time calculation utilities
 */

const WORDS_PER_MINUTE = 200;
const MIN_MINUTES = 1;

/**
 * Calculate estimated reading time for content.
 * @param content - Raw content string (can include markdown/HTML)
 * @param wordsPerMinute - Reading speed (default: 200 WPM)
 * @returns Estimated reading time in minutes (minimum 1)
 */
export const calculateReadingTime = (
  content: string,
  wordsPerMinute: number = WORDS_PER_MINUTE
): number => {
  if (!content) return MIN_MINUTES;
  // Guard against NaN, Infinity, and invalid values
  if (!Number.isFinite(wordsPerMinute) || wordsPerMinute <= 0) {
    wordsPerMinute = WORDS_PER_MINUTE;
  }

  // Strip markdown/HTML artifacts for more accurate count
  const plainText = content
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/`[^`]*`/g, '') // Remove inline code
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // Extract link text
    .replace(/[#*_~`]/g, '') // Remove markdown symbols
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  const wordCount = plainText.split(/\s+/).filter(Boolean).length;
  const minutes = Math.ceil(wordCount / wordsPerMinute);

  // Guard against NaN result
  return Number.isFinite(minutes)
    ? Math.max(MIN_MINUTES, minutes)
    : MIN_MINUTES;
};
