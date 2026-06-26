import { readFileSync, writeFileSync } from 'fs';
import { getDocument } from './node_modules/pdfjs-dist/legacy/build/pdf.mjs';

const data = new Uint8Array(readFileSync('prueba.pdf'));
const pdf = await getDocument({ data, useSystemFonts: true }).promise;
const Y_MIN = 25, Y_MAX = 775;

// Encontrar todas las páginas de src/api/routes.ts
const routesPages = [];
for (let i = 4; i <= pdf.numPages; i++) {
  const page = await pdf.getPage(i);
  const content = await page.getTextContent();
  const tab = content.items.filter(it => it.transform[5] > Y_MAX).map(it => it.str.trim()).filter(Boolean);
  if (tab.includes('src/api/routes.ts')) {
    routesPages.push(i);
  }
}
console.log('Páginas de routes.ts:', routesPages);

// Extraer texto raw (sin filtro de Y) de las primeras 2 páginas
for (const pageNum of routesPages.slice(0, 2)) {
  const page = await pdf.getPage(pageNum);
  const content = await page.getTextContent();
  
  // Agrupar todos los items por Y (sin filtro) para ver qué hay fuera del rango
  const byY = new Map();
  for (const it of content.items) {
    const y = Math.round(it.transform[5]);
    if (!byY.has(y)) byY.set(y, []);
    byY.get(y).push(it);
  }
  
  const ys = [...byY.keys()].sort((a, b) => b - a);
  
  console.log(`\n=== PÁGINA ${pageNum} ===`);
  for (const y of ys) {
    const inRange = y >= Y_MIN && y <= Y_MAX;
    const items = byY.get(y).sort((a, b) => a.transform[4] - b.transform[4]);
    const text = items.map(it => it.str).join('');
    if (text.trim()) {
      console.log(`  ${inRange ? 'OK' : 'FILTRADO'} Y=${String(y).padStart(4)}: ${JSON.stringify(text.slice(0, 100))}`);
    }
  }
}
