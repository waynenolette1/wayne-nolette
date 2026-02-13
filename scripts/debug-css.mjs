/* global document, getComputedStyle, CSSStyleRule */
/**
 * Playwright CSS Debug Tool
 *
 * Launches a headless browser to inspect computed CSS values, take screenshots,
 * and diagnose layout issues on the local dev server.
 *
 * Usage:
 *   node scripts/debug-css.mjs <url-path> [options]
 *
 * Examples:
 *   # Screenshot a page
 *   node scripts/debug-css.mjs /adrs/004-rules-over-ml-fraud-detection/
 *
 *   # Inspect computed styles for specific selectors
 *   node scripts/debug-css.mjs /adrs/004-rules-over-ml-fraud-detection/ --inspect "h2,p,ul"
 *
 *   # Get bounding boxes for alignment debugging
 *   node scripts/debug-css.mjs /adrs/004-rules-over-ml-fraud-detection/ --bbox "h2,p,ul,ol"
 *
 *   # Full-page screenshot at a specific viewport width
 *   node scripts/debug-css.mjs /adrs/004-rules-over-ml-fraud-detection/ --width 768
 *
 *   # Compare alignment of two selectors
 *   node scripts/debug-css.mjs /adrs/004-rules-over-ml-fraud-detection/ --compare "h2,p"
 *
 *   # Dump all CSS rules matching a selector
 *   node scripts/debug-css.mjs /adrs/004-rules-over-ml-fraud-detection/ --rules "p"
 *
 * Options:
 *   --inspect <selectors>   Comma-separated CSS selectors to inspect computed styles
 *   --bbox <selectors>      Comma-separated selectors to get bounding box positions
 *   --compare <sel1,sel2>   Compare left-edge alignment of two selectors
 *   --rules <selector>      Dump all CSS rules that apply to the first match of selector
 *   --width <pixels>        Viewport width (default: 1280)
 *   --height <pixels>       Viewport height (default: 800)
 *   --no-screenshot         Skip screenshot capture
 *   --output <dir>          Output directory for screenshots (default: test-results)
 *
 * Requires:
 *   - Dev server running on localhost:4321 (npm run dev)
 *   - Playwright installed (npx playwright install chromium)
 */

import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'fs';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';
import { BASE_PATH } from '../site.config.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

// Parse CLI args
const args = process.argv.slice(2);
const urlPath = args.find((a) => !a.startsWith('--')) || '/';

function getFlag(name) {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return null;
  return args[idx + 1] || true;
}

function hasFlag(name) {
  return args.includes(`--${name}`);
}

const BASE_URL = `http://localhost:4321${BASE_PATH}`;
const viewportWidth = parseInt(getFlag('width') || '1280', 10);
const viewportHeight = parseInt(getFlag('height') || '800', 10);
const inspectSelectors = getFlag('inspect');
const bboxSelectors = getFlag('bbox');
const compareSelectors = getFlag('compare');
const rulesSelector = getFlag('rules');
const skipScreenshot = hasFlag('no-screenshot');
const outputDir = getFlag('output') || join(PROJECT_ROOT, 'test-results');

async function main() {
  // Ensure output directory exists
  if (!skipScreenshot && !existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: viewportWidth, height: viewportHeight },
  });

  const fullUrl = `${BASE_URL}${urlPath}`;
  console.log(`\nNavigating to: ${fullUrl}`);
  console.log(`Viewport: ${viewportWidth}x${viewportHeight}\n`);

  try {
    await page.goto(fullUrl, { waitUntil: 'networkidle' });
  } catch (err) {
    console.error(
      `Failed to load ${fullUrl}. Is the dev server running? (npm run dev)\n`
    );
    console.error(err.message);
    await browser.close();
    process.exit(1);
  }

  // Screenshot
  if (!skipScreenshot) {
    const slug = urlPath.replace(/\//g, '_').replace(/^_|_$/g, '') || 'index';
    const screenshotPath = join(outputDir, `debug-${slug}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Screenshot saved: ${screenshotPath}`);
  }

  // Inspect computed styles
  if (inspectSelectors) {
    const selectors = inspectSelectors.split(',').map((s) => s.trim());
    console.log('\n--- Computed Styles ---');

    for (const selector of selectors) {
      const result = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const cs = getComputedStyle(el);
        return {
          tag: el.tagName.toLowerCase(),
          text: el.textContent?.slice(0, 60),
          styles: {
            marginLeft: cs.marginLeft,
            marginRight: cs.marginRight,
            paddingLeft: cs.paddingLeft,
            paddingRight: cs.paddingRight,
            maxWidth: cs.maxWidth,
            width: cs.width,
            fontSize: cs.fontSize,
            lineHeight: cs.lineHeight,
            display: cs.display,
            position: cs.position,
          },
        };
      }, selector);

      if (!result) {
        console.log(`\n  ${selector}: NOT FOUND`);
        continue;
      }

      console.log(`\n  ${selector} (<${result.tag}>)`);
      console.log(`  Text: "${result.text}..."`);
      for (const [prop, val] of Object.entries(result.styles)) {
        console.log(`    ${prop}: ${val}`);
      }
    }
  }

  // Bounding boxes
  if (bboxSelectors) {
    const selectors = bboxSelectors.split(',').map((s) => s.trim());
    console.log('\n--- Bounding Boxes ---');

    for (const selector of selectors) {
      const result = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          text: el.textContent?.slice(0, 50),
          left: Math.round(rect.left * 100) / 100,
          top: Math.round(rect.top * 100) / 100,
          width: Math.round(rect.width * 100) / 100,
          height: Math.round(rect.height * 100) / 100,
          right: Math.round(rect.right * 100) / 100,
        };
      }, selector);

      if (!result) {
        console.log(`  ${selector}: NOT FOUND`);
        continue;
      }

      console.log(
        `  ${selector} (<${result.tag}>)  left=${result.left}  top=${result.top}  width=${result.width}  right=${result.right}`
      );
    }
  }

  // Compare alignment
  if (compareSelectors) {
    const [sel1, sel2] = compareSelectors.split(',').map((s) => s.trim());
    console.log(`\n--- Alignment Comparison: ${sel1} vs ${sel2} ---`);

    const result = await page.evaluate(
      ({ s1, s2 }) => {
        const el1 = document.querySelector(s1);
        const el2 = document.querySelector(s2);
        if (!el1 || !el2) return null;

        const r1 = el1.getBoundingClientRect();
        const r2 = el2.getBoundingClientRect();
        const cs1 = getComputedStyle(el1);
        const cs2 = getComputedStyle(el2);

        return {
          el1: {
            tag: el1.tagName.toLowerCase(),
            left: r1.left,
            marginLeft: cs1.marginLeft,
            paddingLeft: cs1.paddingLeft,
          },
          el2: {
            tag: el2.tagName.toLowerCase(),
            left: r2.left,
            marginLeft: cs2.marginLeft,
            paddingLeft: cs2.paddingLeft,
          },
          offset: Math.round((r2.left - r1.left) * 100) / 100,
        };
      },
      { s1: sel1, s2: sel2 }
    );

    if (!result) {
      console.log('  One or both selectors not found');
    } else {
      console.log(
        `  ${sel1} (<${result.el1.tag}>): left=${result.el1.left}, margin-left=${result.el1.marginLeft}, padding-left=${result.el1.paddingLeft}`
      );
      console.log(
        `  ${sel2} (<${result.el2.tag}>): left=${result.el2.left}, margin-left=${result.el2.marginLeft}, padding-left=${result.el2.paddingLeft}`
      );
      console.log(`  Offset: ${result.offset}px`);
      if (Math.abs(result.offset) < 1) {
        console.log('  Result: ALIGNED');
      } else {
        console.log(`  Result: MISALIGNED by ${result.offset}px`);
      }
    }
  }

  // Dump CSS rules
  if (rulesSelector) {
    console.log(`\n--- CSS Rules for: ${rulesSelector} ---`);

    const rules = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;

      const matchedRules = [];
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule instanceof CSSStyleRule && el.matches(rule.selectorText)) {
              matchedRules.push({
                selector: rule.selectorText,
                styles: rule.style.cssText,
                source: sheet.href || 'inline',
              });
            }
          }
        } catch {
          // Cross-origin stylesheets throw SecurityError
        }
      }
      return matchedRules;
    }, rulesSelector);

    if (!rules) {
      console.log('  Selector not found');
    } else if (rules.length === 0) {
      console.log('  No matching CSS rules found');
    } else {
      for (const rule of rules) {
        const source = basename(rule.source || 'inline');
        console.log(`\n  [${source}] ${rule.selector}`);
        console.log(`    ${rule.styles}`);
      }
    }
  }

  // Default: if no inspection flags, show a quick summary
  if (
    !inspectSelectors &&
    !bboxSelectors &&
    !compareSelectors &&
    !rulesSelector
  ) {
    console.log('\nTip: Use flags to inspect CSS:');
    console.log('  --inspect "h2,p"       Show computed styles');
    console.log('  --bbox "h2,p,ul"       Show bounding boxes');
    console.log('  --compare "h2,p"       Compare left-edge alignment');
    console.log('  --rules "p"            Dump matching CSS rules');
  }

  await browser.close();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
