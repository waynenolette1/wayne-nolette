import { describe, it, expect } from 'vitest';
import { CASE_STUDIES_METRICS } from './metrics';

describe('metrics', () => {
  it('exports valid metric sets with expected counts', () => {
    expect(CASE_STUDIES_METRICS).toHaveLength(4);

    for (const metric of CASE_STUDIES_METRICS) {
      expect(metric.value).toBeTruthy();
      expect(metric.label).toBeTruthy();
      expect(typeof metric.rawNumber).toBe('number');
    }
  });
});
