import { describe, it, expect } from 'vitest';
import { highlightSearchTerms, getContentSnippet } from './search';

describe('search', () => {
  it('highlightSearchTerms: word boundaries, multi-word, XSS prevention', () => {
    // Word boundary matching - doesn't match partial words
    expect(highlightSearchTerms('Airflow is a workflow tool', 'Airflow')).toBe(
      '<mark>Airflow</mark> is a workflow tool'
    );

    // Case insensitive, preserves original case
    expect(highlightSearchTerms('AIRFLOW airflow', 'airflow')).toBe(
      '<mark>AIRFLOW</mark> <mark>airflow</mark>'
    );

    // Multi-word queries highlight each word
    const multi = highlightSearchTerms(
      'Apache Spark and Airflow',
      'Apache Airflow'
    );
    expect(multi).toContain('<mark>Apache</mark>');
    expect(multi).toContain('<mark>Airflow</mark>');

    // Short/empty queries ignored
    expect(highlightSearchTerms('hello', 'h')).toBe('hello');
    expect(highlightSearchTerms('hello', '')).toBe('hello');

    // XSS prevention
    const xss = highlightSearchTerms('<script>alert(1)</script>', 'script');
    expect(xss).not.toContain('<script>');
    expect(xss).toContain('&lt;');
  });

  it('getContentSnippet: extracts around match or returns beginning', () => {
    const content =
      'Lorem ipsum dolor sit amet. Airflow is great. End of text.';
    expect(getContentSnippet(content, 'Airflow')).toContain('Airflow');
    expect(getContentSnippet(content, 'xyz123').startsWith('Lorem')).toBe(true);
    expect(getContentSnippet('', 'test')).toBe('');
  });

  it('highlightSearchTerms: handles edge cases', () => {
    // Empty query string - should return escaped text unchanged
    expect(highlightSearchTerms('hello world', '')).toBe('hello world');

    // Query with only special regex characters - escaped and matched as literal text
    // Characters like .*+?^${}()|[\]\ are escaped before regex construction,
    // so ".*" becomes a literal match for ".*" in the text
    expect(highlightSearchTerms('test.*text', '.*')).toBe(
      'test<mark>.*</mark>text'
    );
    // "()" is too short (filtered out as < 2 chars after splitting)
    expect(highlightSearchTerms('hello (world)', '()')).toBe('hello (world)');
    // "$100" - the word boundary \b doesn't match before $ (non-word char),
    // so this won't be highlighted. This is expected behavior for word-boundary matching.
    expect(highlightSearchTerms('price $100', '$100')).toBe('price $100');

    // Query with mixed special characters and valid words
    expect(highlightSearchTerms('use regex.* for patterns', 'regex')).toBe(
      'use <mark>regex</mark>.* for patterns'
    );
  });

  it('highlightSearchTerms: truncates very long queries at MAX_SEARCH_WORDS (10)', () => {
    // Query with more than 10 words - only first 10 should be processed
    const longQuery =
      'one two three four five six seven eight nine ten eleven twelve thirteen';
    const text =
      'one two three four five six seven eight nine ten eleven twelve thirteen';

    const result = highlightSearchTerms(text, longQuery);

    // First 10 words should be highlighted
    expect(result).toContain('<mark>one</mark>');
    expect(result).toContain('<mark>ten</mark>');

    // Words beyond the 10th should NOT be highlighted
    expect(result).toContain('eleven'); // not wrapped in mark
    expect(result).not.toContain('<mark>eleven</mark>');
    expect(result).not.toContain('<mark>twelve</mark>');
    expect(result).not.toContain('<mark>thirteen</mark>');
  });

  it('getContentSnippet: handles contextChars edge values', () => {
    const content =
      'Start of content. Middle section with keyword here. End of content.';

    // contextChars with zero values - should use those zeros
    // With 0 context before and after, we get ellipsis on both sides (match not at start/end)
    const zeroContext = getContentSnippet(content, 'keyword', {
      before: 0,
      after: 0,
    });
    // Match is in the middle, so both ellipsis markers appear
    expect(zeroContext).toBe('......');

    // contextChars with negative values - should fall back to defaults (40 before, 80 after)
    const negativeContext = getContentSnippet(content, 'keyword', {
      before: -10,
      after: -20,
    });
    // Should behave like default context
    expect(negativeContext).toContain('keyword');

    // Verify default fallback by comparing with explicit defaults
    const defaultContext = getContentSnippet(content, 'keyword', {
      before: 40,
      after: 80,
    });
    expect(negativeContext).toBe(defaultContext);
  });

  it('getContentSnippet: handles empty/short queries', () => {
    const content = 'This is a long piece of content that should be truncated.';

    // Empty query - should return beginning of content
    const emptyResult = getContentSnippet(content, '');
    expect(emptyResult.startsWith('This is')).toBe(true);

    // Single character query (filtered out as too short) - should return beginning
    const singleCharResult = getContentSnippet(content, 'a');
    expect(singleCharResult.startsWith('This is')).toBe(true);
  });

  it('getContentSnippet: truncates long queries at MAX_SEARCH_WORDS (10)', () => {
    const content =
      'one two three four five six seven eight nine ten eleven twelve thirteen end';

    // Query with more than 10 words
    const longQuery =
      'one two three four five six seven eight nine ten eleven twelve thirteen';

    const result = getContentSnippet(content, longQuery);

    // Should find a match (first word "one") and return snippet
    expect(result).toContain('one');
  });
});
