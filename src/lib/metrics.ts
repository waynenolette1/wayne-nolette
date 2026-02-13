/**
 * Headline metrics displayed across the portfolio.
 * Each metric represents a quantified result from production work.
 *
 * Animation fields (rawNumber, prefix, suffix, decimals) drive the counter
 * animation effect. rawNumber is the DISPLAY value (e.g., 36 for "36"),
 * and suffix indicates scale (K/M/B/%/+).
 */

interface Metric {
  /** Static display value (e.g., "36", "16+"). Fallback if JS disabled. */
  value: string;
  /** What the metric measures (e.g., "events/day", "uptime"). */
  label: string;
  /** Target number for counter animation (display value, not raw). */
  rawNumber: number;
  /** Prepended to animated number (e.g., "$"). */
  prefix: string;
  /** Appended to animated number. Also indicates scale (K/M/B/%/+). */
  suffix: string;
  /** Decimal places during animation (e.g., 0 for "36"). */
  decimals: number;
  /** Short context for compact views. */
  detail?: string;
  /** Longer context description. */
  context?: string;
}

/** Metrics for the case studies impact banner. */
export const CASE_STUDIES_METRICS: Metric[] = [
  {
    value: '6→1',
    rawNumber: 6,
    prefix: '',
    suffix: '→1',
    decimals: 0,
    label: 'systems unified',
    detail: 'DataDog, PagerDuty, Jira, Slack, Zoom, Backstage → IE Hub',
  },
  {
    value: '12%',
    rawNumber: 12,
    prefix: '',
    suffix: '%',
    decimals: 0,
    label: 'defect reduction',
    detail: 'Quality engineering at BAE Systems',
  },
  {
    value: '2K+',
    rawNumber: 2,
    prefix: '',
    suffix: 'K+',
    decimals: 0,
    label: 'stale monitors flagged',
    detail: 'From 9,000+ monitors governed via DataDog pipeline',
  },
  {
    value: '3',
    rawNumber: 3,
    prefix: '',
    suffix: '',
    decimals: 0,
    label: 'awards',
    detail: 'MVP, Pioneer Award, Pathfinder Award',
  },
];
