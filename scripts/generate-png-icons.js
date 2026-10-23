import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const docsDir = path.join(rootDir, 'docs');
const sourceArtwork = path.join(publicDir, 'assets/aistudio/1792771044094_ceb8d248.jpg');

console.log('Generating PWA icons from user artwork...');

if (fs.existsSync(sourceArtwork)) {
  console.log('Found source artwork:', sourceArtwork);
  try {
    // Generate 512x512 PNG
    execSync(`convert "${sourceArtwork}" -fill "#1E1E1E" -fuzz 15% -draw "color 0,0 floodfill" -draw "color 2047,0 floodfill" -draw "color 0,2047 floodfill" -draw "color 2047,2047 floodfill" -resize 512x512 "${path.join(publicDir, 'icon-512.png')}"`);
    
    // Generate 192x192 PNG
    execSync(`convert "${sourceArtwork}" -fill "#1E1E1E" -fuzz 15% -draw "color 0,0 floodfill" -draw "color 2047,0 floodfill" -draw "color 0,2047 floodfill" -draw "color 2047,2047 floodfill" -resize 192x192 "${path.join(publicDir, 'icon-192.png')}"`);

    // Copy to root and docs
    const png512 = fs.readFileSync(path.join(publicDir, 'icon-512.png'));
    const png192 = fs.readFileSync(path.join(publicDir, 'icon-192.png'));

    fs.writeFileSync(path.join(rootDir, 'icon-512.png'), png512);
    fs.writeFileSync(path.join(rootDir, 'icon-192.png'), png192);
    fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), png192);

    if (fs.existsSync(docsDir)) {
      fs.writeFileSync(path.join(docsDir, 'icon-512.png'), png512);
      fs.writeFileSync(path.join(docsDir, 'icon-192.png'), png192);
      fs.writeFileSync(path.join(docsDir, 'apple-touch-icon.png'), png192);
    }

    console.log('Successfully generated icons from user artwork!');
  } catch (err) {
    console.error('Error generating from artwork:', err);
  }
} else {
  console.warn('Source artwork not found at', sourceArtwork);
}
