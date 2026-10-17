/* بيجمع اللعبة كلها في ملف HTML واحد (dist/game.html) — للمعاينة
   السريعة أو للنشر كـ Artifact. المشروع نفسه مش محتاج build عشان يشتغل. */
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const js = (await build({ entryPoints: ['main.js'], bundle: true, format: 'iife', minify: true, write: false, target: 'es2020' })).outputFiles[0].text;
const css = readFileSync('style-tokens.css', 'utf8') + '\n' + readFileSync('style-app.css', 'utf8');
let html = readFileSync('index.html', 'utf8')
  .replace(/<link rel="stylesheet" href="style-tokens.css">\s*<link rel="stylesheet" href="style-app.css">/, `<style>\n${css}\n</style>`)
  .replace('<script type="module" src="main.js"></script>', () => `<script>\n${js}\n</script>`);
mkdirSync('dist', { recursive: true });
writeFileSync('dist/game.html', html);
console.log('✓ dist/game.html', Math.round(html.length / 1024) + 'KB');
