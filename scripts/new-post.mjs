#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { question, closeReadline, slugify, escapeYaml } from './shared.mjs';
import { BASE_PATH } from '../site.config.mjs';

async function main() {
  console.log('\n Create New Blog Post\n');

  const title = await question('Title: ');
  const description = await question('Description (one sentence): ');
  const tagsInput = await question(
    'Tags (comma-separated, e.g., rust,performance,architecture): '
  );
  const tags = tagsInput
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const confidenceInput = await question(
    'Confidence level (high/medium) [medium]: '
  );
  const confidenceLevel =
    confidenceInput.toLowerCase() === 'high' ? 'high' : 'medium';

  const slug = slugify(title);
  const today = new Date().toISOString().split('T')[0];

  const frontmatter = `---
title: "${escapeYaml(title)}"
description: "${escapeYaml(description)}"
pubDate: ${today}
tags: [${tags.map((t) => `"${escapeYaml(t)}"`).join(', ')}]
draft: true
confidenceLevel: ${confidenceLevel}
---

## Problem

What was broken, missing, or insufficient? Be specific with metrics if available.

## Constraints

- Scale:
- Latency requirements:
- Cost constraints:
- Timeline:

## Approach

What did you build and why?

### Key Implementation Details

\`\`\`rust
// Add relevant code snippets
\`\`\`

## Tradeoffs & Rejected Options

### Option 1: [Name]
Why rejected...

### Option 2: [Name]
Why rejected...

### What We Accepted
Downsides of chosen approach...

## Results

| Metric | Before | After |
|--------|--------|-------|
| Metric 1 | X | Y |
| Metric 2 | X | Y |

## Lessons Learned

### Would Repeat
- ...

### Would Avoid
- ...

### Open Questions
- ...
`;

  const filePath = path.join(
    process.cwd(),
    'src',
    'content',
    'writing',
    `${slug}.md`
  );

  if (fs.existsSync(filePath)) {
    console.log(`\n File already exists: ${filePath}`);
    closeReadline();
    process.exit(1);
  }

  fs.writeFileSync(filePath, frontmatter);
  console.log(`\n Created: ${filePath}`);
  console.log(
    `\n Run 'npm run dev' and visit: http://localhost:4321${BASE_PATH}writing/${slug}/`
  );
  console.log('\nRemember: Set draft: false when ready to publish.\n');

  closeReadline();
}

main().catch(console.error);
