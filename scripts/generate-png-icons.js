import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const docsDir = path.join(rootDir, 'docs');
const distDir = path.join(rootDir, 'dist');
const primaryArtwork = path.join(publicDir, 'assets/aistudio/C_pia_de_IGREJA_2cd666cc.png');
const fallbackArtwork = path.join(publicDir, 'assets/aistudio/1792771044094_ceb8d248.jpg');
const sourceArtwork = fs.existsSync(primaryArtwork) ? primaryArtwork : fallbackArtwork;

console.log('Generating PWA icons from user artwork...');

if (fs.existsSync(sourceArtwork)) {
  console.log('Found source artwork:', sourceArtwork);
  try {
    if (sourceArtwork === primaryArtwork) {
      // 1. Crop pure squircle icon from artwork
      execSync(`convert "${sourceArtwork}" -crop 472x434+303+154 +repage /tmp/raw_sq.png`);

      // 2. Generate 512x512 PWA app icon (centered on black background, safe zone)
      execSync(`convert /tmp/raw_sq.png -resize 380x380 /tmp/sq_512.png`);
      execSync(`convert -size 512x512 xc:black /tmp/sq_512.png -gravity center -composite "${path.join(publicDir, 'icon-512.png')}"`);

      // 3. Generate 192x192 PWA app icon
      execSync(`convert /tmp/raw_sq.png -resize 142x142 /tmp/sq_192.png`);
      execSync(`convert -size 192x192 xc:black /tmp/sq_192.png -gravity center -composite "${path.join(publicDir, 'icon-192.png')}"`);

      // 4. Generate icon-badge.png for mobile notification status bar and header circle
      // Android requires badge icons to have 100% transparent background with alpha-only silhouette.
      // A solid background causes Android to render an opaque dark square.
      execSync(`convert "${sourceArtwork}" -crop 520x480+279+131 +repage /tmp/wide_sq.ppm`);
      const rawWide = fs.readFileSync('/tmp/wide_sq.ppm');
      let pWide = 15;
      const wWide = 520, hWide = 480;
      const badgeRgba = Buffer.alloc(wWide * hWide * 4);
      for (let i = 0; i < wWide * hWide; i++) {
        const r = rawWide[pWide++];
        const g = rawWide[pWide++];
        const b = rawWide[pWide++];
        if (r > 30 && r > g * 1.15 && r > b * 1.15) {
          const edge = Math.min(1, Math.max(0, (r - 20) / 45));
          const alpha = Math.round(edge * 255);
          badgeRgba[i * 4 + 0] = 255;
          badgeRgba[i * 4 + 1] = 255;
          badgeRgba[i * 4 + 2] = 255;
          badgeRgba[i * 4 + 3] = alpha;
        } else {
          badgeRgba[i * 4 + 0] = 0;
          badgeRgba[i * 4 + 1] = 0;
          badgeRgba[i * 4 + 2] = 0;
          badgeRgba[i * 4 + 3] = 0;
        }
      }
      fs.writeFileSync('/tmp/badge_raw.rgba', badgeRgba);
      execSync(`convert -size ${wWide}x${hWide} -depth 8 /tmp/badge_raw.rgba -trim +repage /tmp/badge_trimmed.png`);
      execSync(`convert /tmp/badge_trimmed.png -resize 68x68 -gravity center -background none -extent 96x96 -define png:color-type=6 "${path.join(publicDir, 'icon-badge.png')}"`);

      // 5. Generate full logo with text
      execSync(`convert "${sourceArtwork}" -crop 960x1020+60+100 +repage "${path.join(publicDir, 'logo-full.png')}"`);
    } else {
      execSync(`convert "${sourceArtwork}" -fill "#1E1E1E" -fuzz 15% -draw "color 0,0 floodfill" -draw "color 2047,0 floodfill" -draw "color 0,2047 floodfill" -draw "color 2047,2047 floodfill" -resize 512x512 "${path.join(publicDir, 'icon-512.png')}"`);
      execSync(`convert "${sourceArtwork}" -fill "#1E1E1E" -fuzz 15% -draw "color 0,0 floodfill" -draw "color 2047,0 floodfill" -draw "color 0,2047 floodfill" -draw "color 2047,2047 floodfill" -resize 192x192 "${path.join(publicDir, 'icon-192.png')}"`);
      execSync(`convert "${path.join(publicDir, 'icon-192.png')}" -resize 68x68 -gravity center -background none -extent 96x96 -define png:color-type=6 "${path.join(publicDir, 'icon-badge.png')}"`);
    }

    const png512 = fs.readFileSync(path.join(publicDir, 'icon-512.png'));
    const png192 = fs.readFileSync(path.join(publicDir, 'icon-192.png'));
    const b64_512 = png512.toString('base64');

    // 6. OVERWRITE OLD SVG ICONS so no yellow-cross SVGs exist anywhere!
    const modernSvgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="105" fill="#000000"/>
  <image href="data:image/png;base64,${b64_512}" width="512" height="512"/>
</svg>
`;
    fs.writeFileSync(path.join(publicDir, 'icon.svg'), modernSvgContent);
    fs.writeFileSync(path.join(publicDir, 'icon-192.svg'), modernSvgContent);
    fs.writeFileSync(path.join(publicDir, 'icon-512.svg'), modernSvgContent);

    // Sync to root
    fs.writeFileSync(path.join(rootDir, 'icon-512.png'), png512);
    fs.writeFileSync(path.join(rootDir, 'icon-192.png'), png192);
    fs.writeFileSync(path.join(rootDir, 'apple-touch-icon.png'), png192);
    fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), png192);
    fs.writeFileSync(path.join(rootDir, 'icon.svg'), modernSvgContent);
    fs.writeFileSync(path.join(rootDir, 'icon-192.svg'), modernSvgContent);
    fs.writeFileSync(path.join(rootDir, 'icon-512.svg'), modernSvgContent);

    if (fs.existsSync(path.join(publicDir, 'icon-badge.png'))) {
      const badgePng = fs.readFileSync(path.join(publicDir, 'icon-badge.png'));
      fs.writeFileSync(path.join(rootDir, 'icon-badge.png'), badgePng);
    }

    if (fs.existsSync(path.join(publicDir, 'logo-full.png'))) {
      const fullLogoPng = fs.readFileSync(path.join(publicDir, 'logo-full.png'));
      fs.writeFileSync(path.join(rootDir, 'logo-full.png'), fullLogoPng);
    }

    // Sync to docs/
    if (fs.existsSync(docsDir)) {
      fs.writeFileSync(path.join(docsDir, 'icon-512.png'), png512);
      fs.writeFileSync(path.join(docsDir, 'icon-192.png'), png192);
      fs.writeFileSync(path.join(docsDir, 'apple-touch-icon.png'), png192);
      fs.writeFileSync(path.join(docsDir, 'icon.svg'), modernSvgContent);
      fs.writeFileSync(path.join(docsDir, 'icon-192.svg'), modernSvgContent);
      fs.writeFileSync(path.join(docsDir, 'icon-512.svg'), modernSvgContent);
      if (fs.existsSync(path.join(publicDir, 'icon-badge.png'))) {
        fs.writeFileSync(path.join(docsDir, 'icon-badge.png'), fs.readFileSync(path.join(publicDir, 'icon-badge.png')));
      }
      if (fs.existsSync(path.join(publicDir, 'logo-full.png'))) {
        fs.writeFileSync(path.join(docsDir, 'logo-full.png'), fs.readFileSync(path.join(publicDir, 'logo-full.png')));
      }
    }

    // Sync to dist/ if exists
    if (fs.existsSync(distDir)) {
      fs.writeFileSync(path.join(distDir, 'icon-512.png'), png512);
      fs.writeFileSync(path.join(distDir, 'icon-192.png'), png192);
      fs.writeFileSync(path.join(distDir, 'apple-touch-icon.png'), png192);
      fs.writeFileSync(path.join(distDir, 'icon.svg'), modernSvgContent);
      fs.writeFileSync(path.join(distDir, 'icon-192.svg'), modernSvgContent);
      fs.writeFileSync(path.join(distDir, 'icon-512.svg'), modernSvgContent);
      if (fs.existsSync(path.join(publicDir, 'icon-badge.png'))) {
        fs.writeFileSync(path.join(distDir, 'icon-badge.png'), fs.readFileSync(path.join(publicDir, 'icon-badge.png')));
      }
      if (fs.existsSync(path.join(publicDir, 'logo-full.png'))) {
        fs.writeFileSync(path.join(distDir, 'logo-full.png'), fs.readFileSync(path.join(publicDir, 'logo-full.png')));
      }
    }

    console.log('Successfully generated icons from user artwork!');
  } catch (err) {
    console.error('Error generating from artwork:', err);
  }
} else {
  console.warn('Source artwork not found at', sourceArtwork);
}
