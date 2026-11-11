// Baut dist/ereignis.html: eine einzige Datei (für Handy, Artefakt, file://).  Aufruf: node werkzeug/bauen.mjs
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const r = await build({ entryPoints: ['src/haupt.js'], bundle: true, format: 'esm', write: false, minify: false, target: 'es2022' });
const html = readFileSync('index.html', 'utf8').replace('<script type="module" src="src/haupt.js"></script>', () => `<script type="module">\n${r.outputFiles[0].text}</script>`);
mkdirSync('dist', { recursive: true });
writeFileSync('dist/ereignis.html', html);
// Fassung für Claude-Artefakte: nur Seiteninhalt, ohne <html>/<head>/<body>
const kopf = html.slice(html.indexOf('<title>'), html.indexOf('</head>')), rumpf = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'));
writeFileSync('dist/artefakt.html', kopf + rumpf);
console.log('dist/ereignis.html', (html.length / 1024).toFixed(0) + ' kB');
