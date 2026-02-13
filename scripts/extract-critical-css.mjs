#!/usr/bin/env node
/**
 * Critical CSS extraction script
 * Extracts and inlines above-the-fold CSS for faster initial render
 *
 * This script is designed to work with the build output.
 * Run with: node scripts/extract-critical-css.mjs
 */

import { readdir, readFile, writeFile, stat } from 'fs/promises';
import { join } from 'path';

const CONFIG = {
  // Build output directory
  distDir: 'dist',
  // CSS files to analyze
  cssPattern: /\.css$/,
  // HTML files to process
  htmlPattern: /\.html$/,
  // Critical CSS selectors (above-the-fold elements) - be very selective
  criticalSelectors: [
    // Core only
    ':root {',
    'html {',
    'body {',
    'header {',
    '.site-header',
    '.nav-links',
    '.nav-link',
    '.logo',
    // Skip generic selectors like h1, p, a as they're too broad
  ],
  // Exclude patterns (even if they match critical selectors)
  excludePatterns: [
    '@keyframes',
    '.article',
    '.prose',
    '.toc',
    '.footer',
    'code',
    'pre',
    '.search',
    '.modal',
    '.dialog',
  ],
  // Max size for inline CSS (bytes)
  maxInlineSize: 10000,
  // Verbose output
  verbose: true,
};

/**
 * Get all files matching pattern recursively
 */
async function getFiles(dir, pattern, files = []) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      await getFiles(fullPath, pattern, files);
    } else if (entry.isFile() && pattern.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Parse CSS into rules
 */
function parseCSS(css) {
  const rules = [];
  let current = '';
  let depth = 0;
  let inComment = false;

  for (let i = 0; i < css.length; i++) {
    const char = css[i];
    const next = css[i + 1];

    // Handle comments
    if (char === '/' && next === '*') {
      inComment = true;
      current += '/*';
      i++;
      continue;
    }
    if (char === '*' && next === '/') {
      inComment = false;
      current += '*/';
      i++;
      continue;
    }
    if (inComment) {
      current += char;
      continue;
    }

    current += char;

    if (char === '{') {
      depth++;
    } else if (char === '}') {
      depth--;
      if (depth === 0) {
        rules.push(current.trim());
        current = '';
      }
    }
  }

  return rules;
}

/**
 * Check if a CSS rule should be excluded
 */
function shouldExclude(rule) {
  const lowerRule = rule.toLowerCase();
  for (const pattern of CONFIG.excludePatterns) {
    if (lowerRule.includes(pattern.toLowerCase())) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a CSS rule is critical (above-the-fold)
 */
function isCriticalRule(rule) {
  // First check exclusions
  if (shouldExclude(rule)) {
    return false;
  }

  const lowerRule = rule.toLowerCase();

  // Only include :root if it defines CSS variables
  if (lowerRule.startsWith(':root') && lowerRule.includes('--')) {
    return true;
  }

  // Check against critical selectors (exact match preferred)
  for (const selector of CONFIG.criticalSelectors) {
    if (lowerRule.includes(selector.toLowerCase())) {
      return true;
    }
  }

  return false;
}

/**
 * Extract critical CSS from a stylesheet
 */
function extractCriticalCSS(css) {
  const rules = parseCSS(css);
  const critical = [];

  for (const rule of rules) {
    // Handle @media queries
    if (rule.startsWith('@media')) {
      // Extract the media query content
      const mediaMatch = rule.match(/@media[^{]+\{([\s\S]+)\}$/);
      if (mediaMatch) {
        const mediaContent = mediaMatch[1];
        const innerRules = parseCSS(mediaContent);
        const criticalInner = innerRules.filter(isCriticalRule);

        if (criticalInner.length > 0) {
          const mediaPrefix = rule.match(/@media[^{]+/)[0];
          critical.push(`${mediaPrefix} { ${criticalInner.join(' ')} }`);
        }
      }
    } else if (isCriticalRule(rule)) {
      critical.push(rule);
    }
  }

  return critical.join('\n');
}

/**
 * Minify CSS (basic minification)
 */
function minifyCSS(css) {
  return (
    css
      // Remove comments
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      // Remove spaces around brackets and colons
      .replace(/\s*{\s*/g, '{')
      .replace(/\s*}\s*/g, '}')
      .replace(/\s*:\s*/g, ':')
      .replace(/\s*;\s*/g, ';')
      .replace(/;\}/g, '}')
      .trim()
  );
}

/**
 * Inject critical CSS into HTML
 */
function injectCriticalCSS(html, criticalCSS, cssFile) {
  // Create the inline style tag
  const inlineStyle = `<style id="critical-css">${criticalCSS}</style>`;

  // Create preload for the full stylesheet
  const preload = `<link rel="preload" href="${cssFile}" as="style" onload="this.onload=null;this.rel='stylesheet'">`;
  const noscriptFallback = `<noscript><link rel="stylesheet" href="${cssFile}"></noscript>`;

  // Find the first stylesheet link and replace it
  const linkPattern = new RegExp(
    `<link[^>]+href=["']${cssFile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>`
  );

  if (linkPattern.test(html)) {
    // Replace the link with critical CSS + preload
    return html.replace(
      linkPattern,
      `${inlineStyle}\n    ${preload}\n    ${noscriptFallback}`
    );
  }

  // If no matching link found, inject before </head>
  return html.replace('</head>', `${inlineStyle}\n  </head>`);
}

/**
 * Main entry point
 */
async function main() {
  console.log('Critical CSS Extraction');
  console.log('=======================\n');

  // Check if dist directory exists
  try {
    await stat(CONFIG.distDir);
  } catch {
    console.log('No dist directory found. Run "npm run build" first.');
    return;
  }

  // Find CSS files
  const cssFiles = await getFiles(CONFIG.distDir, CONFIG.cssPattern);
  console.log(`Found ${cssFiles.length} CSS file(s)`);

  if (cssFiles.length === 0) {
    console.log('No CSS files to process.');
    return;
  }

  // Extract critical CSS from all stylesheets
  let allCriticalCSS = '';

  for (const cssFile of cssFiles) {
    const css = await readFile(cssFile, 'utf-8');
    const critical = extractCriticalCSS(css);
    allCriticalCSS += critical + '\n';

    if (CONFIG.verbose) {
      console.log(
        `  ${cssFile}: ${css.length} bytes -> ${critical.length} bytes critical`
      );
    }
  }

  // Minify the critical CSS
  const minified = minifyCSS(allCriticalCSS);
  console.log(
    `\nCritical CSS: ${minified.length} bytes (limit: ${CONFIG.maxInlineSize})`
  );

  if (minified.length > CONFIG.maxInlineSize) {
    console.warn(
      `Warning: Critical CSS exceeds ${CONFIG.maxInlineSize} bytes. Consider reducing.`
    );
  }

  // Find HTML files
  const htmlFiles = await getFiles(CONFIG.distDir, CONFIG.htmlPattern);
  console.log(`\nProcessing ${htmlFiles.length} HTML file(s)`);

  let processed = 0;
  for (const htmlFile of htmlFiles) {
    const html = await readFile(htmlFile, 'utf-8');

    // Find the main CSS file reference
    const cssLinkMatch = html.match(
      /<link[^>]+href=["']([^"']+\.css)["'][^>]*>/
    );
    if (!cssLinkMatch) {
      if (CONFIG.verbose) {
        console.log(`  Skipping ${htmlFile}: No CSS link found`);
      }
      continue;
    }

    const cssHref = cssLinkMatch[1];

    // Inject critical CSS
    const updatedHtml = injectCriticalCSS(html, minified, cssHref);
    await writeFile(htmlFile, updatedHtml);
    processed++;

    if (CONFIG.verbose) {
      console.log(`  Updated: ${htmlFile}`);
    }
  }

  console.log(`\n=======================`);
  console.log(`Processed ${processed} HTML file(s)`);
  console.log(`Critical CSS size: ${minified.length} bytes`);
}

// Run the script
main().catch(console.error);
