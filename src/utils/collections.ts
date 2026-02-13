/**
 * Utilities for working with content collections
 */

/**
 * Sort items by publication date in descending order (newest first).
 * @param items - Array of items with data.pubDate
 * @returns Sorted array (new array, doesn't mutate original)
 */
export const sortByDateDesc = <T extends { data: { pubDate: Date } }>(
  items: T[]
): T[] =>
  [...items].sort((a, b) => {
    const pubDateA = a.data?.pubDate;
    const pubDateB = b.data?.pubDate;
    const dateA =
      pubDateA instanceof Date && !isNaN(pubDateA.getTime())
        ? pubDateA.valueOf()
        : 0;
    const dateB =
      pubDateB instanceof Date && !isNaN(pubDateB.getTime())
        ? pubDateB.valueOf()
        : 0;
    return dateB - dateA;
  });

/**
 * Sort items by order field in ascending order.
 * @param items - Array of items with data.order
 * @returns Sorted array (new array, doesn't mutate original)
 */
export const sortByOrder = <T extends { data: { order: number } }>(
  items: T[]
): T[] =>
  [...items].sort((a, b) => {
    const orderA = a.data?.order ?? 0;
    const orderB = b.data?.order ?? 0;
    return orderA - orderB;
  });

/**
 * Group posts by year.
 * @param posts - Array of posts with pubDate
 * @returns Object with years as keys and arrays of posts as values
 */
export const groupByYear = <T extends { data: { pubDate: Date } }>(
  posts: T[]
): Record<number, T[]> =>
  posts.reduce(
    (acc, post) => {
      const pubDate = post.data?.pubDate;
      if (!(pubDate instanceof Date) || isNaN(pubDate.getTime())) return acc;
      const year = pubDate.getFullYear();
      acc[year] = [...(acc[year] ?? []), post];
      return acc;
    },
    {} as Record<number, T[]>
  );

/**
 * Get sorted years from a grouped-by-year object.
 * @param grouped - Object with year keys
 * @returns Array of years sorted descending (newest first)
 */
export const getSortedYears = (grouped: Record<number, unknown[]>): number[] =>
  Object.keys(grouped)
    .map(Number)
    .sort((a, b) => b - a);
