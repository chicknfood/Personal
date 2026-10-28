import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const assetsDir = path.join(distDir, 'assets');

const files = fs.readdirSync(assetsDir);
const cssFile = files.find(f => f.endsWith('.css'));
const jsFile = files.find(f => f.endsWith('.js'));

const cssContent = cssFile ? fs.readFileSync(path.join(assetsDir, cssFile), 'utf-8') : '';
const jsContent = jsFile
  ? fs.readFileSync(path.join(assetsDir, jsFile), 'utf-8').replace(/<\/script/gi, '<\\/script')
  : '';

const standaloneHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Multiplication Trainer & Bestiary Codex</title>
    <style>${cssContent}</style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module">${jsContent}</script>
  </body>
</html>
`;

const outputPath = path.join(rootDir, 'standalone.html');
fs.writeFileSync(outputPath, standaloneHtml, 'utf-8');
console.log('✓ Created standalone single-file app at standalone.html');
