import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const docsDir = path.join(rootDir, 'docs');
const primaryArtwork = path.join(publicDir, 'assets/aistudio/C_pia_de_IGREJA_2cd666cc.png');
const fallbackArtwork = path.join(publicDir, 'assets/aistudio/1792771044094_ceb8d248.jpg');
const sourceArtwork = fs.existsSync(primaryArtwork) ? primaryArtwork : fallbackArtwork;

console.log('Generating PWA icons from user artwork...');

if (fs.existsSync(sourceArtwork)) {
  console.log('Found source artwork:', sourceArtwork);
  try {
    if (sourceArtwork === primaryArtwork) {
      // Crop pure squircle icon (without text) for clean app installation
      execSync(`convert "${sourceArtwork}" -crop 472x434+303+154 +repage /tmp/raw_sq.png`);

      // Generate 512x512 PWA app icon (centered on black background, safe zone)
      execSync(`convert /tmp/raw_sq.png -resize 370x370 /tmp/sq_512.png`);
      execSync(`convert -size 512x512 xc:black /tmp/sq_512.png -gravity center -composite "${path.join(publicDir, 'icon-512.png')}"`);

      // Generate 192x192 PWA app icon
      execSync(`convert /tmp/raw_sq.png -resize 140x140 /tmp/sq_192.png`);
      execSync(`convert -size 192x192 xc:black /tmp/sq_192.png -gravity center -composite "${path.join(publicDir, 'icon-192.png')}"`);

      // Generate icon-badge.png for mobile notification status bar
      execSync(`convert "${path.join(publicDir, 'icon-192.png')}" -resize 96x96 "${path.join(publicDir, 'icon-badge.png')}"`);

      // Generate full logo with text
      execSync(`convert "${sourceArtwork}" -crop 960x1020+60+100 +repage "${path.join(publicDir, 'logo-full.png')}"`);
    } else {
      execSync(`convert "${sourceArtwork}" -fill "#1E1E1E" -fuzz 15% -draw "color 0,0 floodfill" -draw "color 2047,0 floodfill" -draw "color 0,2047 floodfill" -draw "color 2047,2047 floodfill" -resize 512x512 "${path.join(publicDir, 'icon-512.png')}"`);
      execSync(`convert "${sourceArtwork}" -fill "#1E1E1E" -fuzz 15% -draw "color 0,0 floodfill" -draw "color 2047,0 floodfill" -draw "color 0,2047 floodfill" -draw "color 2047,2047 floodfill" -resize 192x192 "${path.join(publicDir, 'icon-192.png')}"`);
    }

    // Copy to root and docs
    const png512 = fs.readFileSync(path.join(publicDir, 'icon-512.png'));
    const png192 = fs.readFileSync(path.join(publicDir, 'icon-192.png'));

    fs.writeFileSync(path.join(rootDir, 'icon-512.png'), png512);
    fs.writeFileSync(path.join(rootDir, 'icon-192.png'), png192);
    fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), png192);
    fs.writeFileSync(path.join(rootDir, 'apple-touch-icon.png'), png192);

    if (fs.existsSync(path.join(publicDir, 'icon-badge.png'))) {
      const badgePng = fs.readFileSync(path.join(publicDir, 'icon-badge.png'));
      fs.writeFileSync(path.join(rootDir, 'icon-badge.png'), badgePng);
    }

    if (fs.existsSync(path.join(publicDir, 'logo-full.png'))) {
      const fullLogoPng = fs.readFileSync(path.join(publicDir, 'logo-full.png'));
      fs.writeFileSync(path.join(rootDir, 'logo-full.png'), fullLogoPng);
    }

    if (fs.existsSync(docsDir)) {
      fs.writeFileSync(path.join(docsDir, 'icon-512.png'), png512);
      fs.writeFileSync(path.join(docsDir, 'icon-192.png'), png192);
      fs.writeFileSync(path.join(docsDir, 'apple-touch-icon.png'), png192);
      if (fs.existsSync(path.join(publicDir, 'icon-badge.png'))) {
        fs.writeFileSync(path.join(docsDir, 'icon-badge.png'), fs.readFileSync(path.join(publicDir, 'icon-badge.png')));
      }
      if (fs.existsSync(path.join(publicDir, 'logo-full.png'))) {
        fs.writeFileSync(path.join(docsDir, 'logo-full.png'), fs.readFileSync(path.join(publicDir, 'logo-full.png')));
      }
    }

    console.log('Successfully generated icons from user artwork!');
  } catch (err) {
    console.error('Error generating from artwork:', err);
  }
} else {
  console.warn('Source artwork not found at', sourceArtwork);
}
