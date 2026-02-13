import { describe, it, expect } from 'vitest';
import { calculateReadingTime } from './reading-time';

describe('calculateReadingTime', () => {
  it('calculates reading time: minimum 1 min, rounds up, excludes code blocks', () => {
    // Minimum 1 minute for short/empty content
    expect(calculateReadingTime('')).toBe(1);
    expect(calculateReadingTime('Hello world')).toBe(1);

    // 400 words at 200 WPM = 2 minutes
    expect(calculateReadingTime(Array(400).fill('word').join(' '))).toBe(2);

    // 250 words = 1.25 minutes, rounds up to 2
    expect(calculateReadingTime(Array(250).fill('word').join(' '))).toBe(2);

    // Code blocks excluded: 200 prose words + 1000 code words = still 1 minute
    const prose = Array(200).fill('word').join(' ');
    const withCode = `${prose}\n\`\`\`js\n${Array(1000).fill('code').join(' ')}\n\`\`\``;
    expect(calculateReadingTime(withCode)).toBe(1);
  });
});
