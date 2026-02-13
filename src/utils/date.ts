/**
 * Date formatting utilities
 */

interface DateFormatOptions {
  locale?: string;
  year?: 'numeric' | '2-digit';
  month?: 'numeric' | '2-digit' | 'long' | 'short' | 'narrow';
  day?: 'numeric' | '2-digit';
}

const DEFAULT_OPTIONS: DateFormatOptions = {
  locale: 'en-US',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
};

/**
 * Check if a date is valid.
 * @param date - Date object to check
 * @returns True if valid date
 */
const isValidDate = (date: Date): boolean => {
  return date instanceof Date && !isNaN(date.getTime());
};

/**
 * Format a date for display.
 * @param date - Date to format
 * @param options - Formatting options
 * @returns Formatted date string, or null if input is invalid
 */
export const formatDate = (
  date: Date | string,
  options: DateFormatOptions = {}
): string | null => {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const { locale, ...formatOptions } = mergedOptions;

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (!isValidDate(dateObj)) {
    return null;
  }

  return dateObj.toLocaleDateString(locale, formatOptions);
};
