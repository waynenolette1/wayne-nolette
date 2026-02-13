#!/usr/bin/env node
/**
 * Bundle Size Analyzer
 * Analyzes the dist folder to report on JS/CSS bundle sizes.
 * Run with: npm run analyze
 */

import { readdir, readFile } from 'fs/promises';
import { join, extname } from 'path';
import { gzipSync } from 'zlib';

const DIST_DIR = 'dist';
const THRESHOLDS = {
  // Per-file thresholds (in KB)
  js: 50,
  css: 30,
  // Total thresholds (in KB)
  totalJs: 100,
  totalCss: 50,
};

/**
 * Recursively get all files in a directory
 */
async function getAllFiles(dir, files = []) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      await getAllFiles(fullPath, files);
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Get file size info
 */
async function getFileInfo(filePath) {
  const content = await readFile(filePath);
  const gzipped = gzipSync(content);

  return {
    path: filePath.replace(DIST_DIR + '/', ''),
    size: content.length,
    gzipSize: gzipped.length,
  };
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  const kb = bytes / 1024;
  if (kb < 1024) return kb.toFixed(2) + ' KB';
  const mb = kb / 1024;
  return mb.toFixed(2) + ' MB';
}

/**
 * Main analysis function
 */
async function analyze() {
  console.log('\n📊 Bundle Size Analysis\n');
  console.log('='.repeat(60));

  const allFiles = await getAllFiles(DIST_DIR);

  const jsFiles = [];
  const cssFiles = [];
  const htmlFiles = [];
  const otherFiles = [];

  for (const file of allFiles) {
    const ext = extname(file).toLowerCase();
    const info = await getFileInfo(file);

    switch (ext) {
      case '.js':
      case '.mjs':
        jsFiles.push(info);
        break;
      case '.css':
        cssFiles.push(info);
        break;
      case '.html':
        htmlFiles.push(info);
        break;
      default:
        otherFiles.push(info);
    }
  }

  // Sort by size descending
  const sortBySize = (a, b) => b.gzipSize - a.gzipSize;
  jsFiles.sort(sortBySize);
  cssFiles.sort(sortBySize);

  // Calculate totals
  const totalJs = jsFiles.reduce((sum, f) => sum + f.gzipSize, 0);
  const totalCss = cssFiles.reduce((sum, f) => sum + f.gzipSize, 0);
  const totalHtml = htmlFiles.reduce((sum, f) => sum + f.gzipSize, 0);

  // Report JavaScript
  console.log('\n📦 JavaScript Files (gzipped):');
  console.log('-'.repeat(60));

  if (jsFiles.length === 0) {
    console.log('  No JavaScript files found (good for static site!)');
  } else {
    for (const file of jsFiles.slice(0, 10)) {
      const sizeKb = file.gzipSize / 1024;
      const warning = sizeKb > THRESHOLDS.js ? ' ⚠️' : '';
      console.log(`  ${file.path}`);
      console.log(
        `    Size: ${formatBytes(file.size)} → ${formatBytes(file.gzipSize)} gzip${warning}`
      );
    }
    if (jsFiles.length > 10) {
      console.log(`  ... and ${jsFiles.length - 10} more files`);
    }
    console.log(`\n  Total JS: ${formatBytes(totalJs)} gzip`);
    if (totalJs / 1024 > THRESHOLDS.totalJs) {
      console.log(`  ⚠️  Exceeds threshold of ${THRESHOLDS.totalJs}KB`);
    }
  }

  // Report CSS
  console.log('\n🎨 CSS Files (gzipped):');
  console.log('-'.repeat(60));

  if (cssFiles.length === 0) {
    console.log('  CSS is inlined in HTML (Astro default)');
  } else {
    for (const file of cssFiles.slice(0, 10)) {
      const sizeKb = file.gzipSize / 1024;
      const warning = sizeKb > THRESHOLDS.css ? ' ⚠️' : '';
      console.log(`  ${file.path}`);
      console.log(
        `    Size: ${formatBytes(file.size)} → ${formatBytes(file.gzipSize)} gzip${warning}`
      );
    }
    console.log(`\n  Total CSS: ${formatBytes(totalCss)} gzip`);
  }

  // Report HTML
  console.log('\n📄 HTML Summary:');
  console.log('-'.repeat(60));
  console.log(`  ${htmlFiles.length} pages`);
  console.log(`  Total size: ${formatBytes(totalHtml)} gzip`);
  console.log(
    `  Average per page: ${formatBytes(totalHtml / htmlFiles.length)} gzip`
  );

  // Find largest HTML files
  htmlFiles.sort(sortBySize);
  console.log('\n  Largest pages:');
  for (const file of htmlFiles.slice(0, 5)) {
    console.log(`    ${file.path}: ${formatBytes(file.gzipSize)} gzip`);
  }

  // Overall summary
  const totalSize = totalJs + totalCss + totalHtml;
  console.log('\n' + '='.repeat(60));
  console.log('📈 Summary:');
  console.log('-'.repeat(60));
  console.log(`  Total JavaScript: ${formatBytes(totalJs)} gzip`);
  console.log(`  Total CSS: ${formatBytes(totalCss)} gzip`);
  console.log(`  Total HTML: ${formatBytes(totalHtml)} gzip`);
  console.log(`  Combined: ${formatBytes(totalSize)} gzip`);
  console.log('='.repeat(60));

  // Performance grade
  const jsScore =
    totalJs === 0
      ? 100
      : Math.max(0, 100 - (totalJs / 1024 / THRESHOLDS.totalJs) * 50);
  const cssScore =
    totalCss === 0
      ? 100
      : Math.max(0, 100 - (totalCss / 1024 / THRESHOLDS.totalCss) * 50);
  const avgPageSize = totalHtml / htmlFiles.length / 1024;
  const htmlScore = Math.max(0, 100 - (avgPageSize / 20) * 50); // 20KB per page target

  const overallScore = Math.round((jsScore + cssScore + htmlScore) / 3);

  let grade, emoji;
  if (overallScore >= 90) {
    grade = 'A';
    emoji = '🏆';
  } else if (overallScore >= 80) {
    grade = 'B';
    emoji = '✨';
  } else if (overallScore >= 70) {
    grade = 'C';
    emoji = '👍';
  } else if (overallScore >= 60) {
    grade = 'D';
    emoji = '⚠️';
  } else {
    grade = 'F';
    emoji = '🚨';
  }

  console.log(`\n${emoji} Bundle Grade: ${grade} (${overallScore}/100)\n`);

  // Return exit code based on thresholds
  const hasWarnings =
    totalJs / 1024 > THRESHOLDS.totalJs ||
    totalCss / 1024 > THRESHOLDS.totalCss;

  process.exit(hasWarnings ? 1 : 0);
}

analyze().catch((error) => {
  console.error('Analysis failed:', error);
  process.exit(1);
});
