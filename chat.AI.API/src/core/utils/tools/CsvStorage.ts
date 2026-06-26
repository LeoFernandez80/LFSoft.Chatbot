/**
* CsvStorage - Almacenamiento temporal de archivos CSV en memoria
* Los archivos expiran automáticamente después de TTL_MS milisegundos.
*/

import { v4 as uuidv4 } from 'uuid';

const TTL_MS = 60 * 60 * 1000; // 1 hora

interface CsvEntry {
content: string;
filename: string;
expiresAt: number;
}

const storage = new Map<string, CsvEntry>();

/**
* Almacena el contenido CSV y devuelve un ID único para descargarlo.
*/
export function storeCsv(content: string, filename: string): string {
const id = uuidv4();
storage.set(id, { content, filename, expiresAt: Date.now() + TTL_MS });
return id;
}

/**
* Recupera una entrada CSV por ID. Devuelve `undefined` si no existe o expiró.
*/
export function getCsv(id: string): CsvEntry | undefined {
const entry = storage.get(id);
if (!entry) return undefined;
if (Date.now() > entry.expiresAt) {
storage.delete(id);
return undefined;
}
return entry;
}

/**
* Construye un nombre de CSV claro y ligado a lo que se buscó:
* `<entidad-plural>_<criterio>_<fecha>.csv`.
*
* - `entity`: entidad en español y plural (`colaboradores`, `productos`, `facturas`).
* - `criteria`: filtros realmente usados; cada par presente se vuelca como `clave-valor`
*   (las claves van en español porque las lee el usuario). Los valores `null`/vacíos se omiten.
*   Si no hay ningún criterio con valor, se usa `todos`.
* - fecha: `YYYY-MM-DD` del momento de la consulta (único y trazable).
*
* Ej: buildCsvFilename('colaboradores', { nombre: 'Ana Pérez', estado: 'activo' })
*      → 'colaboradores_nombre-ana-perez_estado-activo_2026-06-24.csv'
*/
export function buildCsvFilename(entity: string, criteria: Record<string, any>): string {
	const slug = (v: any) =>
		String(v)
			.normalize('NFD').replace(/[̀-ͯ]/g, '')   // saca acentos
			.toLowerCase().replace(/[^a-z0-9]+/g, '-')  // a-z0-9 → guiones
			.replace(/^-+|-+$/g, '').slice(0, 40);      // recorta extremos y largo
	const parts = Object.entries(criteria)
		.filter(([, v]) => v != null && String(v).trim() !== '')  // solo criterios con valor
		.map(([k, v]) => `${k}-${slug(v)}`);
	const date = new Date().toISOString().slice(0, 10);         // YYYY-MM-DD
	return `${entity}_${parts.join('_') || 'todos'}_${date}.csv`;
}

/**
* Convierte un array de objetos a formato CSV (separado por comas).
*/
export function toCsvString(rows: Record<string, any>[]): string {
if (rows.length === 0) return '';
const headers = Object.keys(rows[0]);
const escape = (val: any): string => {
const str = val == null ? '' : String(val);
return str.includes(',') || str.includes('"') || str.includes('\n')
? `"${str.replace(/"/g, '""')}"` : str;
};
const lines = [
headers.join(','),
...rows.map(row => headers.map(h => escape(row[h])).join(','))
];
return lines.join('\r\n');
}
// Limpieza periódica de entradas expiradas
setInterval(() => {
const now = Date.now();
for (const [id, entry] of storage.entries()) {
if (now > entry.expiresAt) storage.delete(id);
}
}, TTL_MS);