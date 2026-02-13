#!/usr/bin/env node
/**
 * Image optimization script
 * Converts images to WebP and AVIF formats for better compression
 * Run with: node scripts/optimize-images.mjs
 */

import sharp from 'sharp';
import { readdir, stat, mkdir, access } from 'fs/promises';
import { join, parse, relative } from 'path';
import { constants } from 'fs';

const CONFIG = {
  // Source directory for images
  inputDir: 'public/images',
  // Output directory (same as input for in-place optimization)
  outputDir: 'public/images',
  // Supported input formats
  inputFormats: ['.jpg', '.jpeg', '.png'],
  // Output formats to generate
  outputFormats: ['webp', 'avif'],
  // Quality settings (0-100)
  quality: {
    webp: 82,
    avif: 65, // AVIF can use lower quality for same visual result
    jpeg: 85,
    png: 85,
  },
  // Responsive widths to generate
  widths: [320, 640, 768, 1024, 1280, 1536, 1920],
  // Skip if optimized version exists and is newer than source
  skipExisting: true,
  // Generate responsive srcset images
  generateResponsive: true,
  // Verbose output
  verbose: true,
};

/**
 * Check if a file exists
 */
async function fileExists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if source is newer than target
 */
async function isNewer(sourcePath, targetPath) {
  try {
    const [sourceStat, targetStat] = await Promise.all([
      stat(sourcePath),
      stat(targetPath),
    ]);
    return sourceStat.mtimeMs > targetStat.mtimeMs;
  } catch {
    return true; // Target doesn't exist, so source is "newer"
  }
}

/**
 * Get all image files recursively
 */
async function getImageFiles(dir, files = []) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      await getImageFiles(fullPath, files);
    } else if (entry.isFile()) {
      const ext = parse(entry.name).ext.toLowerCase();
      if (CONFIG.inputFormats.includes(ext)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

/**
 * Optimize a single image
 */
async function optimizeImage(inputPath) {
  const { dir, name } = parse(inputPath);
  const relPath = relative(CONFIG.inputDir, inputPath);
  const results = [];

  // Get image metadata
  const image = sharp(inputPath);
  const metadata = await image.metadata();
  const originalWidth = metadata.width || 1920;

  if (CONFIG.verbose) {
    console.log(
      `\nProcessing: ${relPath} (${originalWidth}x${metadata.height})`
    );
  }

  // Generate each format
  for (const format of CONFIG.outputFormats) {
    const outputPath = join(dir, `${name}.${format}`);

    // Check if we should skip
    if (CONFIG.skipExisting && (await fileExists(outputPath))) {
      const needsUpdate = await isNewer(inputPath, outputPath);
      if (!needsUpdate) {
        if (CONFIG.verbose) {
          console.log(`  Skipping ${format} (up to date)`);
        }
        continue;
      }
    }

    try {
      const startTime = Date.now();
      let pipeline = sharp(inputPath);

      if (format === 'webp') {
        pipeline = pipeline.webp({ quality: CONFIG.quality.webp });
      } else if (format === 'avif') {
        pipeline = pipeline.avif({ quality: CONFIG.quality.avif });
      }

      await pipeline.toFile(outputPath);

      const outputStat = await stat(outputPath);
      const inputStat = await stat(inputPath);
      const savings = ((1 - outputStat.size / inputStat.size) * 100).toFixed(1);
      const duration = Date.now() - startTime;

      results.push({
        format,
        outputPath,
        originalSize: inputStat.size,
        optimizedSize: outputStat.size,
        savings,
        duration,
      });

      if (CONFIG.verbose) {
        console.log(
          `  ${format}: ${formatBytes(outputStat.size)} (${savings}% smaller) [${duration}ms]`
        );
      }
    } catch (error) {
      console.error(`  Error creating ${format}: ${error.message}`);
    }
  }

  // Generate responsive images
  if (CONFIG.generateResponsive) {
    for (const width of CONFIG.widths) {
      // Skip widths larger than original
      if (width >= originalWidth) continue;

      const responsiveName = `${name}-${width}w`;

      for (const format of CONFIG.outputFormats) {
        const outputPath = join(dir, `${responsiveName}.${format}`);

        // Check if we should skip
        if (CONFIG.skipExisting && (await fileExists(outputPath))) {
          const needsUpdate = await isNewer(inputPath, outputPath);
          if (!needsUpdate) {
            continue;
          }
        }

        try {
          let pipeline = sharp(inputPath).resize(width);

          if (format === 'webp') {
            pipeline = pipeline.webp({ quality: CONFIG.quality.webp });
          } else if (format === 'avif') {
            pipeline = pipeline.avif({ quality: CONFIG.quality.avif });
          }

          await pipeline.toFile(outputPath);

          if (CONFIG.verbose) {
            const outputStat = await stat(outputPath);
            console.log(
              `  ${responsiveName}.${format}: ${formatBytes(outputStat.size)}`
            );
          }
        } catch (error) {
          console.error(
            `  Error creating ${responsiveName}.${format}: ${error.message}`
          );
        }
      }
    }
  }

  return results;
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Main entry point
 */
async function main() {
  console.log('Image Optimization Pipeline');
  console.log('===========================\n');
  console.log(`Input directory: ${CONFIG.inputDir}`);
  console.log(`Output formats: ${CONFIG.outputFormats.join(', ')}`);
  console.log(`Responsive widths: ${CONFIG.widths.join(', ')}`);

  // Check if input directory exists
  if (!(await fileExists(CONFIG.inputDir))) {
    console.log(`\nNo images directory found at ${CONFIG.inputDir}`);
    console.log('Creating empty directory...');
    await mkdir(CONFIG.inputDir, { recursive: true });
    return;
  }

  // Get all image files
  const imageFiles = await getImageFiles(CONFIG.inputDir);

  if (imageFiles.length === 0) {
    console.log('\nNo images found to optimize.');
    return;
  }

  console.log(`\nFound ${imageFiles.length} image(s) to process`);

  let totalOriginal = 0;
  let totalOptimized = 0;
  let totalImages = 0;
  const startTime = Date.now();

  // Process each image
  for (const imagePath of imageFiles) {
    const results = await optimizeImage(imagePath);

    for (const result of results) {
      totalOriginal += result.originalSize;
      totalOptimized += result.optimizedSize;
      totalImages++;
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const totalSavings =
    totalOriginal > 0
      ? ((1 - totalOptimized / totalOriginal) * 100).toFixed(1)
      : 0;

  console.log('\n===========================');
  console.log('Summary');
  console.log('===========================');
  console.log(`Processed: ${imageFiles.length} source image(s)`);
  console.log(`Generated: ${totalImages} optimized image(s)`);
  if (totalOriginal > 0) {
    console.log(
      `Total savings: ${formatBytes(totalOriginal - totalOptimized)} (${totalSavings}%)`
    );
  }
  console.log(`Duration: ${duration}s`);
}

// Run the script
main().catch(console.error);
