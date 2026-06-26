import { readFileSync } from 'fs';
import { getDocument } from './node_modules/pdfjs-dist/legacy/build/pdf.mjs';

const data = new Uint8Array(readFileSync('prueba.pdf'));
const pdf = await getDocument({ data, useSystemFonts: true }).promise;
const Y_MIN = 20, Y_MAX = 775;

// Inspeccionar páginas 20, 21, 22 para ver la secuencia
for (let p = 20; p <= 23; p++) {
  const page = await pdf.getPage(p);
  const content = await page.getTextContent();
  const byY = new Map();
  for (const it of content.items) {
    const y = Math.round(it.transform[5]);
    if (!byY.has(y)) byY.set(y, []);
    byY.get(y).push(it);
  }
  const ys = [...byY.keys()].sort((a, b) => b - a);
  const tab = ys.filter(y => y > Y_MAX).flatMap(y => byY.get(y).map(it => it.str.trim())).filter(Boolean).join(' | ');
  const contentLines = ys.filter(y => y >= Y_MIN && y <= Y_MAX)
    .map(y => byY.get(y).sort((a,b)=>a.transform[4]-b.transform[4]).map(it=>it.str).join(''))
    .filter(l => l.trim());
  
  console.log(`\n=== Página ${p} | Tab: [${tab}] ===`);
  console.log('Primeras 5 líneas:', contentLines.slice(0, 5));
  console.log('Últimas 5 líneas:', contentLines.slice(-5));
}
