import { describe, it, expect } from 'vitest';
import {
  sortByDateDesc,
  sortByOrder,
  groupByYear,
  getSortedYears,
} from './collections';

describe('collections', () => {
  it('sorts, groups, and extracts years correctly', () => {
    const post = (id: string, date: string) => ({
      id,
      data: { pubDate: new Date(date + 'T12:00:00Z') },
    });

    const posts = [
      post('old', '2023-01-01'),
      post('mid', '2024-01-01'),
      post('new', '2024-06-15'),
    ];

    // sortByDateDesc - newest first, doesn't mutate
    const sorted = sortByDateDesc(posts);
    expect(sorted[0].id).toBe('new');
    expect(posts[0].id).toBe('old'); // original unchanged

    // sortByOrder
    const items = [{ data: { order: 3 } }, { data: { order: 1 } }];
    expect(sortByOrder(items)[0].data.order).toBe(1);

    // groupByYear + getSortedYears
    const grouped = groupByYear(posts);
    expect(grouped[2024]).toHaveLength(2);
    expect(grouped[2023]).toHaveLength(1);
    expect(getSortedYears(grouped)).toEqual([2024, 2023]);
  });
});
