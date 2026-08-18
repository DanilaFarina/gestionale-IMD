#!/usr/bin/env node
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, 'public');
const logoPath = path.join(__dirname, 'src', 'assets', 'logo-imd.svg');

// Configurazioni icone
const icons = [
  { size: 192, name: 'pwa-192x192.png' },
  { size: 512, name: 'pwa-512x512.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 150, name: 'mstile-150x150.png' },
];

// Icone maskable (con padding trasparente)
const maskableIcons = [
  { size: 192, name: 'pwa-maskable-192x192.png', padding: 30 },
  { size: 512, name: 'pwa-maskable-512x512.png', padding: 80 },
];

async function generateIcon(inputPath, outputPath, size, paddingPercent = 0) {
  try {
    let pipeline = sharp(inputPath, { density: 300 })
      .resize(Math.floor(size * (1 - paddingPercent / 100)), Math.floor(size * (1 - paddingPercent / 100)), {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      });

    if (paddingPercent > 0) {
      pipeline = pipeline.extend({
        top: Math.floor(size * paddingPercent / 200),
        bottom: Math.floor(size * paddingPercent / 200),
        left: Math.floor(size * paddingPercent / 200),
        right: Math.floor(size * paddingPercent / 200),
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      });
    } else {
      pipeline = pipeline.extend({
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      });
    }

    await pipeline
      .png()
      .toFile(path.join(publicDir, outputPath));
    
    console.log(`✓ Generated ${outputPath} (${size}x${size})`);
  } catch (err) {
    console.error(`✗ Error generating ${outputPath}:`, err.message);
  }
}

async function main() {
  console.log('🎨 Generating PWA icons from logo...\n');

  // Genera icone normali
  for (const icon of icons) {
    await generateIcon(logoPath, icon.name, icon.size, 0);
  }

  console.log();

  // Genera icone maskable con padding
  for (const icon of maskableIcons) {
    await generateIcon(logoPath, icon.name, icon.size, icon.padding);
  }

  console.log('\n✅ All icons generated successfully!');
  console.log(`📁 Icons saved to: ${publicDir}`);
}

main().catch(console.error);
