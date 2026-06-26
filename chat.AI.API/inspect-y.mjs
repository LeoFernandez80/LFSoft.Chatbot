import { readFileSync } from 'fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const pdfPath = process.argv[2] || 'prueba.pdf';
const data = new Uint8Array(readFileSync(pdfPath));
const pdf = await getDocument({ data, useSystemFonts: true }).promise;

// Inspeccionar página 5 (package.json) para ver distribución de Y
const page = await pdf.getPage(5);
const content = await page.getTextContent();
const vp = page.getViewport({ scale: 1 });

console.log('Altura de página:', vp.height);
console.log('\nItems con Y:');
for (const item of content.items) {
  if (!item.str.trim()) continue;
  const y = item.transform[5];
  console.log(`  Y=${Math.round(y).toString().padStart(4)}  ${JSON.stringify(item.str.slice(0, 60))}`);
}
