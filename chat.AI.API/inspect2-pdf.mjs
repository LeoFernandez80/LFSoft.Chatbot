import { readFileSync } from 'fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const pdfPath = process.argv[2] || 'prueba.pdf';
const data = new Uint8Array(readFileSync(pdfPath));

const pdf = await getDocument({ data, useSystemFonts: true }).promise;
const numPages = pdf.numPages;
console.log(`Total de páginas: ${numPages}\n`);

// Ver páginas 4 a 15 con más detalle para entender la estructura de cada archivo
for (let i = 4; i <= Math.min(numPages, 15); i++) {
  const page = await pdf.getPage(i);
  const content = await page.getTextContent();
  const items = content.items;
  
  // Obtener primeras 3 "palabras" o elementos de texto
  const firstItems = items.slice(0, 5).map(it => JSON.stringify(it.str));
  console.log(`--- Página ${i} | primeros items: ${firstItems.join(', ')}`);
}
