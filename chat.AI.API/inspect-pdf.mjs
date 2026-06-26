import { readFileSync } from 'fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const pdfPath = process.argv[2] || 'prueba.pdf';
const data = new Uint8Array(readFileSync(pdfPath));

const pdf = await getDocument({ data, useSystemFonts: true }).promise;
const numPages = pdf.numPages;
console.log(`Total de páginas: ${numPages}\n`);

// Mostrar primeras líneas de las primeras 10 páginas para entender la estructura
const pagesToCheck = Math.min(numPages, 10);
for (let i = 1; i <= pagesToCheck; i++) {
  const page = await pdf.getPage(i);
  const content = await page.getTextContent();
  const text = content.items.map(it => it.str).join('').trim();
  const preview = text.slice(0, 200).replace(/\n/g, ' ');
  console.log(`--- Página ${i} ---`);
  console.log(preview || '(sin texto)');
  console.log();
}
