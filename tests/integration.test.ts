/**
 * Integration tests verifying modules work together correctly.
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import { highlightSearchTerms, getContentSnippet } from '../src/utils/search';
import { formatDate } from '../src/utils/date';
import { calculateReadingTime } from '../src/utils/reading-time';

describe('article display integration', () => {
  it('search, date, and reading time work together for article display', () => {
    const article = {
      title: 'Building Data Pipelines with Apache Airflow',
      content: 'word '.repeat(400), // 400 words
      pubDate: '2024-06-15',
    };

    // Search functionality
    expect(highlightSearchTerms(article.title, 'Airflow')).toContain(
      '<mark>Airflow</mark>'
    );
    expect(highlightSearchTerms(article.title, 'flow')).not.toContain('<mark>'); // word boundary
    expect(getContentSnippet(article.content, 'word')).toBeTruthy();

    // Article metadata
    expect(calculateReadingTime(article.content)).toBe(2);
    expect(formatDate(article.pubDate)).toContain('2024');
  });
});
