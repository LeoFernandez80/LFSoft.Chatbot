import { PDFDocument } from 'pdf-lib';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const pdfPath = process.argv[2] || 'prueba.pdf';
const outputDir = dirname(pdfPath);

const pdfBytes = readFileSync(pdfPath);
const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

const catalog = pdfDoc.catalog;
const namesRef = catalog.get(catalog.context.obj('Names'));

if (!namesRef) {
  // Try direct lookup
  const namesDict = catalog.lookup(catalog.context.obj('Names'));
  if (!namesDict) {
    console.log('No se encontraron archivos embebidos en el PDF.');
    process.exit(0);
  }
}

// Navigate PDF catalog -> Names -> EmbeddedFiles
let embeddedFiles = null;

try {
  const catalogDict = catalog;
  const namesObj = catalogDict.lookup(catalogDict.context.obj('Names'));

  if (!namesObj) {
    console.log('No hay árbol de nombres en el PDF.');
    process.exit(0);
  }

  const embFiles = namesObj.lookup(namesObj.context.obj('EmbeddedFiles'));
  if (!embFiles) {
    console.log('No se encontraron archivos embebidos (EmbeddedFiles) en el PDF.');
    process.exit(0);
  }

  embeddedFiles = embFiles;
} catch (e) {
  console.error('Error leyendo estructura del PDF:', e.message);
  process.exit(1);
}

// Collect all (name, filespec) pairs from the name tree
function collectNameTree(node, pairs = []) {
  // Leaf node: has /Names array with [name, ref, name, ref, ...]
  const namesArr = node.lookup(node.context.obj('Names'));
  if (namesArr) {
    for (let i = 0; i < namesArr.size(); i += 2) {
      const name = namesArr.get(i).decodeText();
      const spec = namesArr.lookup(i + 1);
      pairs.push({ name, spec });
    }
  }

  // Intermediate node: has /Kids array
  const kids = node.lookup(node.context.obj('Kids'));
  if (kids) {
    for (let i = 0; i < kids.size(); i++) {
      const kid = kids.lookup(i);
      collectNameTree(kid, pairs);
    }
  }

  return pairs;
}

const pairs = collectNameTree(embeddedFiles);

if (pairs.length === 0) {
  console.log('El árbol de nombres está vacío, no hay archivos embebidos.');
  process.exit(0);
}

console.log(`Encontrados ${pairs.length} archivo(s) embebido(s):\n`);

for (const { name, spec } of pairs) {
  try {
    // FileSpec dict has /EF (Embedded File) entry with /F or /UF stream ref
    const efDict = spec.lookup(spec.context.obj('EF'));
    if (!efDict) {
      console.warn(`  [!] ${name}: sin entrada /EF, omitiendo.`);
      continue;
    }

    // Try /UF first, then /F
    let streamRef = efDict.lookup(efDict.context.obj('UF')) 
                 || efDict.lookup(efDict.context.obj('F'));
    if (!streamRef) {
      console.warn(`  [!] ${name}: sin stream /F o /UF, omitiendo.`);
      continue;
    }

    const streamBytes = streamRef.contents;

    // Determine output path - use the file name from the spec
    // name may include path separators; preserve directory structure
    const filePath = join(outputDir, name.replace(/\//g, '\\'));
    const fileDir = dirname(filePath);

    if (!existsSync(fileDir)) {
      mkdirSync(fileDir, { recursive: true });
      console.log(`  [+] Carpeta creada: ${fileDir}`);
    }

    writeFileSync(filePath, streamBytes);
    console.log(`  [OK] Extraído: ${filePath} (${streamBytes.length} bytes)`);
  } catch (err) {
    console.error(`  [!] Error procesando "${name}": ${err.message}`);
  }
}
