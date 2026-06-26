/**
 * FieldQuery - Reconocimiento de campos a devolver (proyección) y campos de filtro
 * (campo + valor) a partir de un catálogo de campos de la entidad.
 *
 * - Proyección: qué columnas mostrar (aliases nombrados SIN un valor detrás).
 * - Filtros: por qué acotar (alias seguido de `:`/`=`/espacio y un valor).
 *
 * El catálogo (FieldSpec[]) es la única fuente de verdad: declara TODOS los campos
 * de la entidad con su columna real, etiqueta en español, sinónimos, si es filtrable
 * y su tipo. Se reutiliza en la extracción (IntentClassifierStage) y en el handler.
 */

export interface FieldSpec {
  key: string;                          // slot en inglés
  column: string;                       // columna real del esquema (NO se traduce)
  label: string;                        // encabezado en español para CSV/mensaje
  aliases: string[];                    // cómo lo nombra el usuario (español)
  filterable: boolean;                  // si se puede usar como filtro
  type: 'string' | 'number' | 'date';   // para parsear/quotear el valor del filtro
}

export interface Filter {
  field: FieldSpec;
  value: string | number;
}

/** Conectores/palabras de relleno que NUNCA son un valor de filtro real. */
const STOPWORDS = new Set([
  'y', 'e', 'o', 'u', 'de', 'del', 'la', 'el', 'los', 'las', 'un', 'una',
  'con', 'para', 'por', 'que', 'en', 'a', 'al', 'su', 'sus', 'lo'
]);

const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Detecta el pedido EXPLÍCITO de todos los campos: "todos los campos/datos/columnas",
 * "toda la información", "el detalle/listado completo". Fuerza la proyección completa
 * (catálogo entero), incluso si la intención define un subconjunto por defecto.
 * No matchea "todas las actividades" (la entidad no es "campos/datos/...").
 */
const ALL_FIELDS_RE =
  /\b(todos?|todas?)\s+(los\s+|las\s+|sus\s+|mis\s+)?(campos?|datos?|atributos?|columnas?|informacion|detalles?)\b|\b(informacion|detalle|listado|reporte)\s+completos?\b|\btoda\s+la\s+informacion\b/;

export function wantsAllFields(message: string): boolean {
  return ALL_FIELDS_RE.test(norm(message));
}

/**
 * Filtros (campo + valor): por cada campo filtrable busca su alias seguido de un valor.
 * Devuelve los filtros detectados y el texto sobrante (sin lo que ya consumió un filtro),
 * para que ese resto se use luego en la proyección.
 */
export function extractFilters(
  message: string,
  catalog: FieldSpec[]
): { filters: Filter[]; rest: string } {
  let rest = ` ${norm(message)} `;
  const filters: Filter[] = [];
  const aliasSet = new Set(catalog.flatMap(f => f.aliases.map(norm)));

  for (const f of catalog.filter(c => c.filterable)) {
    for (const alias of f.aliases.map(norm)) {
      // "grupo 28", "grupo: 5", "moneda = 2", "nombre EATON" → captura el valor que sigue.
      const re = new RegExp(
        `\\b${escapeRe(alias)}\\b\\s*[:=]?\\s*("[^"]+"|[\\wáéíóúñ.\\-]+)`,
        'i'
      );
      const m = rest.match(re);
      if (!m) continue;

      const raw = m[1].replace(/^"|"$/g, '').replace(/[.,;]+$/, '');
      const rawN = norm(raw);

      // No es un valor real si es un conector o el nombre de otro campo
      // (caso de una enumeración de proyección: "descripción, descuento y moneda").
      if (!rawN || STOPWORDS.has(rawN) || aliasSet.has(rawN)) continue;
      // Un campo numérico sólo se filtra con un valor numérico.
      if (f.type === 'number' && !/^\d/.test(rawN)) continue;

      filters.push({ field: f, value: f.type === 'number' ? Number(raw) : raw });
      rest = rest.replace(m[0], ' '); // consumir para que NO se cuente como proyección
      break;
    }
  }

  return { filters, rest };
}

/**
 * Proyección (qué devolver): campos cuyo alias aparece en el texto (ya sin los filtros).
 * Se devuelven en el ORDEN en que aparecen en el mensaje (no en el orden del catálogo),
 * para respetar cómo el usuario los enumeró. Si no se nombra ningún campo, el llamador
 * devuelve TODO el catálogo.
 */
export function extractRequestedFields(rest: string, catalog: FieldSpec[]): FieldSpec[] {
  const r = norm(rest);
  if (wantsAllFields(r)) return [...catalog]; // "todos los campos" → proyección completa explícita
  const matched: Array<{ field: FieldSpec; pos: number }> = [];
  for (const f of catalog) {
    let pos = Infinity;
    for (const a of f.aliases) {
      const m = r.match(new RegExp(`\\b${escapeRe(norm(a))}\\b`));
      if (m && m.index != null && m.index < pos) pos = m.index;
    }
    if (pos !== Infinity) matched.push({ field: f, pos });
  }
  return matched.sort((a, b) => a.pos - b.pos).map(m => m.field);
}
