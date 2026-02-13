/**
 * Content validation: diagrams and internal links.
 * Single-pass validation of all markdown content.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

const CONTENT_DIR = join(process.cwd(), 'src/content');

function getAllMarkdownFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllMarkdownFiles(fullPath));
    } else if (entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('content validation', () => {
  const allFiles = getAllMarkdownFiles(CONTENT_DIR);

  it('diagrams have balanced brackets and links point to existing files', () => {
    const errors: string[] = [];
    let diagramCount = 0;

    for (const file of allFiles) {
      const content = readFileSync(file, 'utf-8');
      const relativePath = file.replace(CONTENT_DIR, '');

      // Check mermaid diagrams
      const diagrams = extractMermaidDiagrams(content);
      diagramCount += diagrams.length;

      for (const diagram of diagrams) {
        const counts = {
          '[': (diagram.match(/\[/g) || []).length,
          ']': (diagram.match(/\]/g) || []).length,
          '(': (diagram.match(/\(/g) || []).length,
          ')': (diagram.match(/\)/g) || []).length,
          '{': (diagram.match(/\{/g) || []).length,
          '}': (diagram.match(/\}/g) || []).length,
        };

        if (counts['['] !== counts[']'])
          errors.push(`${relativePath}: unbalanced []`);
        if (counts['('] !== counts[')'])
          errors.push(`${relativePath}: unbalanced ()`);
        if (counts['{'] !== counts['}'])
          errors.push(`${relativePath}: unbalanced {}`);
      }

      // Count text-based diagrams too
      if (content.includes('```\n') && content.includes('→')) {
        diagramCount++;
      }

      // Check internal links
      const links = extractInternalLinks(content);
      for (const link of links) {
        const filePath = join(CONTENT_DIR, `${link.replace(/\/$/, '')}.md`);
        if (!existsSync(filePath)) {
          errors.push(`${relativePath}: broken link ${link}`);
        }
      }
    }

    expect(errors, `Validation errors:\n${errors.join('\n')}`).toHaveLength(0);
    expect(diagramCount).toBeGreaterThanOrEqual(5);
  });
});

function extractMermaidDiagrams(content: string): string[] {
  const diagrams: string[] = [];
  const lines = content.split('\n');
  let inMermaid = false;
  let current = '';

  for (const line of lines) {
    if (line.trim() === '```mermaid') {
      inMermaid = true;
      current = '';
    } else if (inMermaid && line.trim() === '```') {
      inMermaid = false;
      diagrams.push(current);
    } else if (inMermaid) {
      current += line + '\n';
    }
  }
  return diagrams;
}

function extractInternalLinks(content: string): string[] {
  const linkRegex = /\]\(\/(?:writing|case-studies|adrs)\/[^)]+\)/g;
  const matches = content.match(linkRegex) || [];
  return matches.map((match) => match.slice(2, -1));
}
