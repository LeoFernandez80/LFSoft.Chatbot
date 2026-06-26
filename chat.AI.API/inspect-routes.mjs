import { readFileSync } from 'fs';
import { getDocument } from './node_modules/pdfjs-dist/legacy/build/pdf.mjs';

const data = new Uint8Array(readFileSync('prueba.pdf'));
const pdf = await getDocument({ data, useSystemFonts: true }).promise;

// Buscar la página donde empieza src/api/routes.ts
for (let i = 4; i <= 30; i++) {
  const page = await pdf.getPage(i);
  const content = await page.getTextContent();
  const tab = content.items.filter(it => it.transform[5] > 775).map(it => it.str.trim()).filter(Boolean);
  if (tab.includes('src/api/routes.ts')) {
    console.log('routes.ts empieza en página', i);
    const Y_MIN = 25, Y_MAX = 775;
    const cont = content.items.filter(it => it.transform[5] >= Y_MIN && it.transform[5] <= Y_MAX);
    for (const it of cont) {
      const y = Math.round(it.transform[5]);
      const x = Math.round(it.transform[4]);
      console.log(`  Y=${String(y).padStart(4)} X=${String(x).padStart(4)}  ${JSON.stringify(it.str)}`);
    }
    break;
  }
}
