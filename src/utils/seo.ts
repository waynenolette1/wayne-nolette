/**
 * SEO utilities for structured data and schema generation.
 */

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbListSchema {
  '@context': string;
  '@type': 'BreadcrumbList';
  itemListElement: Array<{
    '@type': 'ListItem';
    position: number;
    name: string;
    item: string;
  }>;
}

/**
 * Generate JSON-LD BreadcrumbList schema for improved SEO.
 * Breadcrumbs help search engines understand site hierarchy.
 *
 * @param items - Array of breadcrumb items from root to current page
 * @param siteUrl - Base URL of the site
 * @returns JSON-LD BreadcrumbList schema object, or null if items is empty
 */
export function generateBreadcrumbSchema(
  items: BreadcrumbItem[],
  siteUrl: string
): BreadcrumbListSchema | null {
  // Empty breadcrumbs produce invalid schema
  if (!items || items.length === 0) {
    return null;
  }

  // Safely construct URLs, falling back to relative path if URL construction fails
  const buildUrl = (url: string, base: string): string => {
    try {
      return new URL(url, base).toString();
    } catch {
      // If URL construction fails, return the original URL as-is
      return url;
    }
  };

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: buildUrl(item.url, siteUrl),
    })),
  };
}
