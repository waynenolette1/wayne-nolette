import { describe, it, expect } from 'vitest';
import { generateBreadcrumbSchema } from './seo';

describe('generateBreadcrumbSchema', () => {
  it('generates valid schema or returns null for empty input', () => {
    // Empty items returns null
    expect(generateBreadcrumbSchema([], 'https://example.com')).toBeNull();

    // Valid items generate correct schema
    const schema = generateBreadcrumbSchema(
      [
        { name: 'Home', url: '/' },
        { name: 'Writing', url: '/writing/' },
      ],
      'https://example.com'
    );

    expect(schema!['@context']).toBe('https://schema.org');
    expect(schema!['@type']).toBe('BreadcrumbList');
    expect(schema!.itemListElement).toHaveLength(2);
    expect(schema!.itemListElement[0].position).toBe(1);
    expect(schema!.itemListElement[0].item).toBe('https://example.com/');
  });
});
