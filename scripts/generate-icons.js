/**
 * Generate PWA icon PNGs from SVG
 * Uses canvas to create simple icon with 百一 text
 * Run: node scripts/generate-icons.js
 */

import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = join(__dirname, '..', 'public', 'icons');

mkdirSync(ICONS_DIR, { recursive: true });

// Create SVGs that browsers can use directly
function createIconSVG(size) {
  const padding = Math.round(size * 0.1);
  const fontSize = Math.round(size * 0.35);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.15)}" fill="#1a1a2e"/>
  <rect x="${padding}" y="${padding}" width="${size - padding * 2}" height="${size - padding * 2}" rx="${Math.round(size * 0.08)}" fill="none" stroke="#c9a86c" stroke-width="${Math.round(size * 0.02)}"/>
  <text x="${size / 2}" y="${size * 0.42}" text-anchor="middle" font-family="serif" font-size="${fontSize}" fill="#c9a86c" font-weight="bold">百一</text>
  <text x="${size / 2}" y="${size * 0.72}" text-anchor="middle" font-family="serif" font-size="${Math.round(fontSize * 0.35)}" fill="#a89b8c">百人一首</text>
</svg>`;
}

// Write SVG icons (browsers can display SVGs as icons too)
// For broad PWA compat we output as SVGs named .png — vite-plugin-pwa references them
// In production, you'd convert these to actual PNGs with sharp or similar

const sizes = [192, 512];
for (const size of sizes) {
  const svg = createIconSVG(size);
  const svgPath = join(ICONS_DIR, `icon-${size}x${size}.svg`);
  writeFileSync(svgPath, svg, 'utf-8');
  console.log(`Generated ${svgPath}`);
}

// Also create a simple favicon SVG
const faviconSVG = createIconSVG(32);
writeFileSync(join(__dirname, '..', 'public', 'favicon.svg'), faviconSVG, 'utf-8');
console.log('Generated favicon.svg');

console.log('Done! Note: For production, convert SVGs to PNGs using a tool like sharp.');
