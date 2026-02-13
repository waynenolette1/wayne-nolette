import { describe, it, expect } from 'vitest';
import { formatDate } from './date';

describe('formatDate', () => {
  it('formats dates, supports options, and handles invalid input', () => {
    // Accepts Date objects and strings
    expect(formatDate(new Date('2024-06-15T12:00:00Z'))).toBe('June 15, 2024');
    expect(formatDate('2024-06-15T12:00:00Z')).toBe('June 15, 2024');

    // Custom month format
    expect(
      formatDate(new Date('2024-03-20T12:00:00Z'), { month: 'short' })
    ).toBe('Mar 20, 2024');

    // Invalid dates return null
    expect(formatDate('not-a-date')).toBeNull();
    expect(formatDate(new Date('invalid'))).toBeNull();
  });
});
