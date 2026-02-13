/**
 * Search utilities for highlighting and snippet extraction.
 * Used by the SearchDialog component.
 */

/** Maximum words to process in a search query to prevent ReDoS attacks */
const MAX_SEARCH_WORDS = 10;

/**
 * Escape HTML special characters to prevent XSS.
 */
function escapeHtml(str: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return str.replace(/[&<>"']/g, (char) => htmlEscapes[char]);
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Highlight search terms in text using word-boundary matching.
 * Prevents partial substring highlights (e.g., "or" inside "Airflow").
 *
 * @param text - The text to highlight matches in
 * @param query - The search query
 * @returns Text with <mark> tags around matched terms
 */
export function highlightSearchTerms(text: string, query: string): string {
  if (!text || !query || query.trim().length < 2) return escapeHtml(text || '');

  // Escape HTML first to prevent XSS
  const safeText = escapeHtml(text);

  // Split query into words for multi-word searches
  // Limit to MAX_SEARCH_WORDS to prevent ReDoS attacks with complex patterns
  const words = query
    .trim()
    .split(/\s+/)
    .filter((w) => w.length >= 2)
    .slice(0, MAX_SEARCH_WORDS);

  if (words.length === 0) return safeText;

  // Create a regex that matches search words with word boundaries
  // This prevents matching "or" inside "Airflow"
  const pattern = words
    .map((word) => {
      const escaped = escapeRegex(word);
      // Use word boundaries to match whole words only
      return `\\b${escaped}\\b`;
    })
    .join('|');

  const regex = new RegExp(`(${pattern})`, 'gi');

  // Replace matches with highlighted version
  return safeText.replace(regex, '<mark>$1</mark>');
}

/**
 * Extract a snippet around the first occurrence of a search term in content.
 *
 * @param content - The full content to extract from
 * @param query - The search query
 * @param contextChars - Number of characters to show before/after match
 * @returns A snippet with ellipsis if truncated
 */
export function getContentSnippet(
  content: string,
  query: string,
  contextChars: { before: number; after: number } = { before: 40, after: 80 }
): string {
  if (!content) return '';

  // Validate contextChars to prevent unexpected behavior with negative/NaN values
  const before =
    Number.isFinite(contextChars.before) && contextChars.before >= 0
      ? contextChars.before
      : 40;
  const after =
    Number.isFinite(contextChars.after) && contextChars.after >= 0
      ? contextChars.after
      : 80;

  // Limit to MAX_SEARCH_WORDS to prevent ReDoS attacks
  const words = query
    .trim()
    .split(/\s+/)
    .filter((w) => w.length >= 2)
    .slice(0, MAX_SEARCH_WORDS);

  if (words.length === 0) {
    return content.slice(0, 120) + (content.length > 120 ? '...' : '');
  }

  // Find the first occurrence of any search word (case-insensitive)
  let firstMatchIndex = -1;
  const lowerContent = content.toLowerCase();

  for (const word of words) {
    const idx = lowerContent.indexOf(word.toLowerCase());
    if (idx !== -1 && (firstMatchIndex === -1 || idx < firstMatchIndex)) {
      firstMatchIndex = idx;
    }
  }

  if (firstMatchIndex === -1) {
    return content.slice(0, 120) + (content.length > 120 ? '...' : '');
  }

  // Extract snippet around the match (using validated before/after values)
  const snippetStart = Math.max(0, firstMatchIndex - before);
  const snippetEnd = Math.min(content.length, firstMatchIndex + after);

  let snippet = '';
  if (snippetStart > 0) snippet += '...';
  snippet += content.slice(snippetStart, snippetEnd);
  if (snippetEnd < content.length) snippet += '...';

  return snippet;
}
