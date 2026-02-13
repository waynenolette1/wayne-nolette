/**
 * Content consistency checks.
 * Verifies all content follows expected structure and quality patterns.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';

const CONTENT_DIR = join(process.cwd(), 'src/content');

describe('content consistency', () => {
  it('all content is valid, substantive, and meets quality standards', () => {
    const issues: string[] = [];
    const validStatuses = ['accepted', 'proposed', 'deprecated', 'superseded'];

    // Writing articles
    const writingDir = join(CONTENT_DIR, 'writing');
    const writingFiles = readdirSync(writingDir).filter((f) =>
      f.endsWith('.md')
    );
    for (const file of writingFiles) {
      const raw = readFileSync(join(writingDir, file), 'utf-8');
      const { data, content } = matter(raw);

      if (!data.title || !data.description || !data.pubDate) {
        issues.push(`writing/${file}: missing required frontmatter`);
      } else if (new Date(data.pubDate).toString() === 'Invalid Date') {
        issues.push(`writing/${file}: invalid pubDate`);
      }
      if (data.draft === true) {
        issues.push(`writing/${file}: marked as draft`);
      }
      if (content.split(/\s+/).length < 200) {
        issues.push(`writing/${file}: content too short`);
      }
    }

    // Case studies
    const caseStudiesDir = join(CONTENT_DIR, 'case-studies');
    const caseStudyFiles = readdirSync(caseStudiesDir).filter((f) =>
      f.endsWith('.md')
    );

    for (const file of caseStudyFiles) {
      const { data, content } = matter(
        readFileSync(join(caseStudiesDir, file), 'utf-8')
      );

      if (!data.title || !data.description) {
        issues.push(`case-studies/${file}: missing title or description`);
      }
      if (content.trim().length < 100) {
        issues.push(`case-studies/${file}: content too short`);
      }
    }

    // ADRs
    const adrsDir = join(CONTENT_DIR, 'adrs');
    const adrFiles = readdirSync(adrsDir).filter((f) => f.endsWith('.md'));

    for (const file of adrFiles) {
      const { data, content } = matter(
        readFileSync(join(adrsDir, file), 'utf-8')
      );

      if (!data.title || !data.description || !data.pubDate) {
        issues.push(`adrs/${file}: missing required frontmatter`);
      }
      if (data.status && !validStatuses.includes(data.status)) {
        issues.push(`adrs/${file}: invalid status "${data.status}"`);
      }
      if (content.trim().length < 50) {
        issues.push(`adrs/${file}: content too short`);
      }
    }

    // Assertions
    expect(issues, `Issues:\n${issues.join('\n')}`).toHaveLength(0);

    // Minimum content thresholds ensure the portfolio has substantive content:
    // - 10 writing articles: covers key topics with depth
    // - 4 case studies: covers key projects with depth
    // - 3 ADRs: shows architectural decision documentation practice
    expect(writingFiles.length).toBeGreaterThanOrEqual(10);
    expect(caseStudyFiles.length).toBeGreaterThanOrEqual(4);
    expect(adrFiles.length).toBeGreaterThanOrEqual(3);
  });
});
