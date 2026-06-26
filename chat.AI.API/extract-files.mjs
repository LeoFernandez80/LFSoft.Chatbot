import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

// -----------------------------------------------------------------------
// Y thresholds (PDF units, page height ~841.92):
//   Y >= 810       → date/title header bar (always skip)
//   775 <= Y < 810 → file tab zone:
//                    - Start page of a file: contains the filename
//                    - Continuation pages:   overflow code from prev page
//   20 <= Y < 775  → normal content area
//   Y < 20         → footer URL (always skip)
// -----------------------------------------------------------------------
const Y_HEADER  = 810;
const Y_TAB_TOP = 775;
const Y_FOOT    = 20;

const pdfPath   = process.argv[2] || 'prueba.pdf';
const outputDir = process.argv[3] || dirname(pdfPath);

const data = new Uint8Array(readFileSync(pdfPath));
const pdf  = await getDocument({ data, useSystemFonts: true }).promise;
const numPages = pdf.numPages;
console.log(`PDF: ${numPages} páginas\n`);

// -----------------------------------------------------------------------
// Helper: group items by rounded Y, reconstruct lines top-to-bottom
// -----------------------------------------------------------------------
function buildLines(items) {
  const byY = new Map();
  for (const it of items) {
    if (it.str === undefined) continue;
    const y = Math.round(it.transform[5]);
    if (!byY.has(y)) byY.set(y, []);
    byY.get(y).push(it);
  }
  return [...byY.keys()]
    .sort((a, b) => b - a)
    .map(y => ({
      y,
      text: byY.get(y)
        .sort((a, b) => a.transform[4] - b.transform[4])
        .map(it => it.str)
        .join('')
    }));
}

// -----------------------------------------------------------------------
// Helper: reconstruct one PDF page's items into plain text
// -----------------------------------------------------------------------
function reconstructPageText(items) {
  const lines = buildLines(items);
  if (!lines.length) return '';
  const result = [];
  let prevY = null;
  const LINE_H = 13;
  for (const { y, text } of lines) {
    if (prevY !== null) {
      const gap   = prevY - y;
      const blank = Math.max(0, Math.round(gap / LINE_H) - 1);
      for (let b = 0; b < Math.min(blank, 3); b++) result.push('');
    }
    prevY = y;
    result.push(text.trimEnd());
  }
  return result.join('\n');
}

// -----------------------------------------------------------------------
// Paso 1: Leer índice de archivos (páginas 2–3)
// -----------------------------------------------------------------------
const indexFiles = [];
const indexRx = /^(.+?)\s+\d+\s+líneas?(\s*·.*)?$/;

for (let i = 2; i <= 3; i++) {
  const page = await pdf.getPage(i);
  const { items } = await page.getTextContent();
  const filtered = items.filter(it => it.transform[5] >= Y_FOOT && it.transform[5] < Y_HEADER);
  for (const { text } of buildLines(filtered)) {
    const m = text.trim().match(indexRx);
    if (m) indexFiles.push(m[1].trim());
  }
}
console.log(`Archivos detectados en el índice (${indexFiles.length}):`);
indexFiles.forEach(f => console.log('  ' + f));
console.log();

const indexSet = new Set(indexFiles);

// -----------------------------------------------------------------------
// Paso 2: Escanear páginas de código (4 en adelante)
//
// Para cada página PDF:
//   tabZone  = items con Y_TAB_TOP <= Y < Y_HEADER
//   bodyZone = items con Y_FOOT    <= Y < Y_TAB_TOP
//
// Si el tab contiene el nombre de un archivo del índice → inicio de archivo.
// Si no → página de continuación: el tab contiene código desbordado,
//         añadirlo ANTES del cuerpo normal (overflow primero, orden top→bottom).
// -----------------------------------------------------------------------
const files = []; // { name, pages: [itemsArray] }

for (let i = 4; i <= numPages; i++) {
  const page = await pdf.getPage(i);
  const { items } = await page.getTextContent();

  const tabZone  = items.filter(it => it.transform[5] >= Y_TAB_TOP && it.transform[5] < Y_HEADER);
  const bodyZone = items.filter(it => it.transform[5] >= Y_FOOT    && it.transform[5] < Y_TAB_TOP);

  const tabTexts   = tabZone.map(it => it.str.trim()).filter(Boolean);
  const matchedName = tabTexts.find(t => indexSet.has(t));

  if (matchedName) {
    // Primera página del archivo: sólo el cuerpo (el tab tiene el nombre)
    files.push({ name: matchedName, pages: [bodyZone] });
  } else if (files.length > 0) {
    // Continuación: overflow (tab) + cuerpo.
    // Como Y en el tab es > Y en el cuerpo, al ordenar por Y desc
    // el overflow queda al inicio de la página → correcto.
    files[files.length - 1].pages.push([...tabZone, ...bodyZone]);
  }
}

// -----------------------------------------------------------------------
// Paso 3: Reconstruir texto y guardar
// -----------------------------------------------------------------------
console.log(`\nExtrayendo ${files.length} archivos en: ${outputDir}\n`);

for (const file of files) {
  const pageTexts = file.pages.map(pageItems => reconstructPageText(pageItems));
  const text = pageTexts.join('\n');
  const filePath = join(outputDir, file.name.replace(/\//g, '\\'));
  const fileDir  = dirname(filePath);

  if (!existsSync(fileDir)) {
    mkdirSync(fileDir, { recursive: true });
    console.log(`  [+] Carpeta creada: ${fileDir}`);
  }

  writeFileSync(filePath, text, 'utf8');
  console.log(`  [OK] ${file.name}  (${text.split('\n').length} líneas)`);
}

console.log('\nExtracción completada.');
