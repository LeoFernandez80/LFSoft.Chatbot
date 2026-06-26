import { readFileSync } from 'fs';
import { getDocument } from './node_modules/pdfjs-dist/legacy/build/pdf.mjs';

const data = new Uint8Array(readFileSync('prueba.pdf'));
const pdf = await getDocument({ data, useSystemFonts: true }).promise;

// Ver exactamente qué Y tienen los items del "tab" de la página 21
const page = await pdf.getPage(21);
const content = await page.getTextContent();

console.log('=== Página 21 - todos los items con Y >= 775 ===');
const tabItems = content.items.filter(it => it.transform[5] >= 775);
for (const it of tabItems) {
  console.log(`  Y=${Math.round(it.transform[5])} X=${Math.round(it.transform[4])} str=${JSON.stringify(it.str)}`);
}

console.log('\n=== Y >= 760 (zona baja del encabezado y contenido) ===');
const nearTop = content.items.filter(it => it.transform[5] >= 760);
for (const it of nearTop) {
  console.log(`  Y=${Math.round(it.transform[5])} X=${Math.round(it.transform[4])} str=${JSON.stringify(it.str)}`);
}
