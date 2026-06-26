---
name: agregar-busqueda
description: Agrega una nueva intención de BÚSQUEDA (lectura/consulta) de extremo a extremo al pipeline de chat.AI.API. Úsalo cuando el usuario quiera que el bot entienda un pedido de buscar/consultar/listar datos de una entidad, reconozca sinónimos, elija qué campos devolver (proyección) y por qué filtrar, lo enrute a un handler que lea desde un conector (Access DB, in-memory, REST, GraphQL, caché) y devuelva el resultado (0 → sin resultados, 1 → datos en el mensaje, varios → CSV descargable). Al terminar compila el proyecto, corrige errores hasta que no quede ninguno y lo deja ejecutándose para probar. Dispara con frases como "agrega una búsqueda", "quiero que el bot busque colaboradores", "crear intent para consultar artículos", "que liste las facturas del grupo A". Para Crear/Agregar/Modificar/Eliminar/Borrar usa las skills específicas de esas acciones, NO esta.
---

# Agregar una intención de BÚSQUEDA al pipeline

Esta skill es **especialista en búsquedas** (acción `search`, operación de **lectura**): crea **todo el flujo** para que un mensaje del usuario que pide consultar/listar datos sea interpretado y devuelva una respuesta, conectándose a la fuente de datos indicada.

> **Alcance (IMPORTANTE):** esta skill cubre **únicamente** la acción **Buscar** (lectura: SELECT / find / GET). Las acciones que **escriben** datos —Crear, Agregar, Modificar, Eliminar, Borrar— se manejan con **otras skills** dedicadas. Si el usuario pide una de esas, no la implementes acá: derivá a la skill correspondiente.

Una intención de búsqueda = **acción `buscar`** + **ENTIDAD**. Ej: "búscame colaboradores" → acción `buscar` + entidad `colaboradores` → intent `search_collaborators`. La entidad debe quedar identificada con claridad para poder invocar al handler que resuelve la consulta.

> **Convención de nombres (IMPORTANTE):** todo **identificador de código** va en **inglés** — nombres de intent, clases, métodos, variables y slots de `entities`. Lo único que va en **español** son los **sinónimos** de los patrones regex (porque matchean el lenguaje natural del usuario) y los **mensajes/preguntas dirigidos al usuario** (porque los lee una persona hispanohablante). Los nombres reales de tablas/campos del esquema de la base se respetan tal cual existan (no se traducen ni se inventan).

## Paso 0 — Recolectar la definición

Antes de tocar código, asegúrate de tener estos datos. Si falta alguno, **pregunta al usuario** (usa AskUserQuestion para el conector si no lo dijo):

| Dato | Ejemplo | Notas |
|------|---------|-------|
| **Entidad** | colaboradores, pedidos, facturas | Sobre qué objeto se busca |
| **Nombre del intent** | `search_collaborators` | `snake_case` **en inglés** = `search_<entity>` |
| **Conector de datos** | Access DB / in-memory / REST / GraphQL / caché | De dónde salen los datos (solo lectura) |
| **Catálogo de campos** | `code→Art_Codigo`, `description→Art_Descripcion`, `listPrice→Art_PrecioLista`, `group→Art_Grupo` (con sinónimos) | **Todos** los campos de la entidad con su columna real, sinónimos en español, si es filtrable y su tipo. Habilita la **proyección** (qué devolver) y los **filtros** (por qué filtrar). Ver "Catálogo de campos: proyección + filtros" |
| **Lógica de resolución** | tabla `Colaboradores`, filtrar por nombre | Query/endpoint y forma del resultado (nombres reales del esquema) |
| **Sinónimos de la acción (buscar)** | busca, necesito, quiero, traeme, dame, muéstrame, listar, consultar | En español — ver diccionario abajo |
| **Sinónimos de la entidad** | empleados, personal, trabajadores | En español — variantes de la misma entidad |

**Regla clave sobre la lógica:** si la forma de resolver los datos está **clara** (tabla/colección/endpoint y qué campos devolver), implementa la consulta real en el handler. Si **no está clara** (no se sabe la fuente, los campos o cómo filtrar), genera el handler igual pero que devuelva un `ActionResult` avisando que no puede resolverla todavía (ver plantilla "Handler sin lógica definida"), y díselo al usuario explícitamente. No inventes nombres de tablas/campos.

### Sinónimos de la acción Buscar

El intent se nombra con el verbo **en inglés** `search` + la **entidad en inglés**: `search_<entity>` (ej. `search_collaborators`, `search_orders`). Los **sinónimos van en español** y se usan tal cual en el patrón regex. Al construir el patrón usá TODOS estos sinónimos, de modo que "búscame colaboradores", "necesito colaboradores" y "quiero colaboradores" produzcan la misma intención.

| Acción | Verbo (intent) | Operación | Sinónimos en español (alternativas regex) |
|--------|----------------|-----------|--------------------------------------------|
| **Buscar** | `search` | lectura (SELECT / find / GET) | `busca\|búscame\|buscame\|buscar\|necesito\|quiero\|quisiera\|traeme\|tráeme\|dame\|muéstrame\|muestrame\|mostrame\|muestra\|ver\|listar\|lista\|consultar\|consulta\|obtener\|obtené\|cuáles son\|cuales son\|hay\|encontrar\|encuentra\|filtrar\|filtra` |

Notas:
- Si el usuario usa un verbo de lectura que no figura, agregá ese **sinónimo en español** a la fila.
- Si el verbo del usuario **no es de lectura** (crear, modificar, eliminar, etc.), **esta skill no aplica**: corresponde a otra skill de acción.
- **El conector solo se usa en modo lectura.** El conector Access DB de este proyecto es solo lectura, ideal para búsquedas. Para búsquedas sobre la base in-memory usá `getDatabase().collection(...).find(...)`.

### Datos de una búsqueda: criterios (requeridos) y refinamientos (opcionales)

El mensaje del usuario trae **datos** (slots) que el handler necesita. Para una búsqueda:

| Acción | Requerido (mínimo para ejecutar) | Opcional (afina) |
|--------|----------------------------------|------------------|
| **Buscar** | Al menos **un** criterio de filtro (cualquiera de los definidos). Sin ningún criterio → pedir uno (o listar todo si esa es la política de la intención). | Filtros adicionales, `limit`, orden, paginación |

Reglas:
- **Buscar usa lógica *OR* sobre los criterios:** basta con que venga uno para ejecutar.
- **Forma del resultado de una búsqueda (obligatorio):** según cuántos registros devuelva la consulta:
  - **0 registros** → `success: false`, `message` avisando que no se encontró nada, `data: null`.
  - **exactamente 1 registro** → `success: true` y `message` con **los datos del registro mostrados en el mensaje** (no se genera CSV).
  - **más de 1 registro** → `success: true`, `multipleResults: true` y `csvDownloadId` (generado con `storeCsv(toCsvString(rows), filename)`, donde `filename` se arma con la **convención de nombre del CSV** — entidad + criterio + fecha, ver Paso 2) para que el usuario **descargue el CSV**; el `message`/template solo anuncia cuántos se encontraron y que puede descargar la lista. No se vuelcan todos los registros al texto.
- Define los campos como una **especificación por intención** (catálogo de campos) y reutilízala tanto en la extracción (Paso 1) como en la consulta del handler (Paso 2). Mantenelas sincronizadas.
- Para cada criterio, decidí su **extractor**: etiqueta explícita (`documento: 123`, `nombre: Ana`), patrón (números, fechas, montos), palabra clave (estados, categorías) o texto libre restante. Un criterio ausente se extrae como `null`/`undefined`.
- Si **no viene ningún criterio**, el handler responde `needsMoreInfo: true` con una `question` puntual pidiendo por qué dato filtrar (salvo que la intención permita listar todo).

### Catálogo de campos: proyección (qué devolver) + filtros (por qué filtrar)

Una búsqueda permite al usuario elegir **dos listas independientes** en el mismo mensaje:

- **Campos a devolver (proyección):** qué columnas mostrar. Ej. *"quiero el **código, descripción y precio lista**…"*.
- **Campos de filtro (con valor):** por qué acotar. Ej. *"…de los artículos **del grupo Tecnología**"* → filtro `grupo = Tecnología`.

> Frases de referencia:
> - *"quiero el código, descripción y precio lista de los artículos del grupo Tecnología"* → **devolver** `[code, description, listPrice]`, **filtrar** `group = "Tecnología"`.
> - *"quiero **todos los campos** de los criterios del grupo A"* → **devolver** el catálogo **completo** (pedido explícito), **filtrar** `group = "A"`.
> - *"quiero los criterios del grupo A"* (sin nombrar campos) → proyección **vacía** → el handler devuelve **todos** los campos por default, **filtrar** `group = "A"`.

Para reconocer ambas, **declará SIEMPRE el catálogo completo de campos de la entidad** (todos, no solo los que se filtran). Sólo si un campo está en el catálogo el skill puede reconocerlo cuando el usuario lo nombra. Cada campo mapea: clave en inglés (slot), columna real del esquema, etiqueta en español (para CSV/mensaje), sinónimos en español (cómo lo nombra el usuario), si es filtrable y su tipo. Este catálogo es la **única fuente de verdad** y se reutiliza en la extracción (Paso 1) y en el handler (Paso 2).

Helper reutilizable (ponelo junto a los handlers, p. ej. `FieldQuery.ts`, y reusalo en todas las búsquedas con proyección/filtros):

```ts
// chat.AI.API/src/core/pipeline/handlers/FieldQuery.ts
export interface FieldSpec {
  key: string;                          // slot en inglés
  column: string;                       // columna real del esquema (NO se traduce)
  label: string;                        // encabezado en español para CSV/mensaje
  aliases: string[];                    // cómo lo nombra el usuario (español)
  filterable: boolean;                  // si se puede usar como filtro
  type: 'string' | 'number' | 'date';   // para parsear/quotear el valor del filtro
}

export interface Filter { field: FieldSpec; value: string | number; }

const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Filtros (campo + valor): alias seguido de `:`/`=`/espacio y un valor. Devuelve los filtros y el texto sobrante. */
export function extractFilters(message: string, catalog: FieldSpec[]): { filters: Filter[]; rest: string } {
  let rest = ` ${norm(message)} `;
  const filters: Filter[] = [];
  for (const f of catalog.filter(c => c.filterable)) {
    for (const alias of f.aliases.map(norm)) {
      // "grupo Tecnologia", "grupo: 5", "precio = 100" → captura el valor que sigue al alias
      const re = new RegExp(`\\b${alias}\\b\\s*[:=]?\\s*("[^"]+"|[\\wáéíóúñ.\\-]+)`, 'i');
      const m = rest.match(re);
      if (m) {
        const raw = m[1].replace(/^"|"$/g, '');
        filters.push({ field: f, value: f.type === 'number' ? Number(raw) : raw });
        rest = rest.replace(m[0], ' ');   // consumir el match para que NO se cuente como proyección
        break;
      }
    }
  }
  return { filters, rest };
}

/** Detecta el pedido EXPLÍCITO de todos los campos: "todos los campos/datos/columnas",
 *  "toda la información", "el detalle/listado completo", "todo". Fuerza el catálogo completo. */
const ALL_FIELDS_RE =
  /\b(todos?|todas?)\s+(los\s+|las\s+|sus\s+|mis\s+)?(campos?|datos?|atributos?|columnas?|informacion|detalles?)\b|\b(informacion|detalle|listado|reporte)\s+completos?\b|\btoda\s+la\s+informacion\b/;

export function wantsAllFields(message: string): boolean {
  return ALL_FIELDS_RE.test(norm(message));
}

/** Proyección (qué devolver): aliases nombrados SIN un valor a continuación, en el ORDEN del mensaje.
 *  Si el usuario pide explícitamente "todos los campos" → devuelve el catálogo COMPLETO. */
export function extractRequestedFields(rest: string, catalog: FieldSpec[]): FieldSpec[] {
  const r = norm(rest);
  if (wantsAllFields(r)) return [...catalog];   // "todos los campos" → proyección completa explícita
  const matched: Array<{ field: FieldSpec; pos: number }> = [];
  for (const f of catalog) {
    let pos = Infinity;
    for (const a of f.aliases) {
      const m = r.match(new RegExp(`\\b${norm(a)}\\b`));
      if (m && m.index != null && m.index < pos) pos = m.index;
    }
    if (pos !== Infinity) matched.push({ field: f, pos });
  }
  return matched.sort((a, b) => a.pos - b.pos).map(m => m.field);   // orden = aparición en el mensaje
}
```

Ejemplo de catálogo (declará **todos** los campos de la entidad):

```ts
export const ARTICLE_FIELDS: FieldSpec[] = [
  { key: 'code',        column: 'Art_Codigo',      label: 'código',       aliases: ['código', 'codigo', 'cod'],                  filterable: true, type: 'string' },
  { key: 'description', column: 'Art_Descripcion',  label: 'descripción',  aliases: ['descripción', 'descripcion', 'desc'],       filterable: true, type: 'string' },
  { key: 'listPrice',   column: 'Art_PrecioLista',  label: 'precio lista', aliases: ['precio lista', 'precio de lista', 'precio'], filterable: true, type: 'number' },
  { key: 'group',       column: 'Art_Grupo',        label: 'grupo',        aliases: ['grupo'],                                    filterable: true, type: 'string' },
  { key: 'stock',       column: 'Art_Stock',        label: 'stock',        aliases: ['stock', 'existencia', 'existencias'],       filterable: true, type: 'number' },
];
```

Reglas:
- **Heurística devolver vs filtrar:** un campo nombrado **con un valor detrás** ("grupo Tecnología", "precio: 100") es un **filtro**; un campo nombrado **suelto** dentro de la enumeración ("código, descripción, precio lista") es una **proyección**. Por eso `extractFilters` corre **primero** y consume el texto que matchea; `extractRequestedFields` se aplica sobre el **resto**.
- **"Todos los campos" → catálogo completo (explícito):** si el usuario pide expresamente todos los campos ("quiero **todos los campos** de los criterios", "dame **toda la información**", "el **detalle completo**"), `extractRequestedFields` lo detecta con `wantsAllFields` y devuelve el catálogo **completo**, **aunque la intención tenga un subconjunto por defecto**. Es un pedido explícito que pisa cualquier default acotado.
- **Proyección vacía → todo (implícito):** si el usuario **no nombra** campos a devolver ("quiero los criterios del grupo A"), `extractRequestedFields` devuelve `[]` y el handler aplica el default: el **conjunto completo** del catálogo (o el subconjunto por defecto que defina la intención). Resultado para el usuario: igualmente recibe todos los campos salvo que la intención defina explícitamente un subconjunto.
- **Orden de la proyección:** los campos pedidos se devuelven en el **orden en que aparecen en el mensaje** (lo resuelve `extractRequestedFields` ordenando por posición), no en el orden del catálogo. Así "descripción, descuento y moneda" sale en ese mismo orden en el detalle y en el CSV.
- **Filtros:** combiná todos con `AND`. El valor puede ser **nombre o código**; si la columna es un código y el usuario dio un nombre, resolvé el código (lookup/sub-consulta) o filtrá por la columna de nombre correspondiente.
- **Siempre declarar todos los campos:** el catálogo lista **cada** campo de la entidad aunque hoy no se filtre por él, para que el skill reconozca cualquier campo que el usuario pida devolver.

## Paso 1 — Clasificación + extracción de datos

Archivo: `chat.AI.API/src/core/pipeline/stages/IntentClassifierStage.ts`

**1a.** En `classifyWithRules`, agrega una regla nueva al array `rules`. El `intent` va **en inglés**; el patrón une los **sinónimos de la acción buscar (español)** con los **sinónimos de la entidad (español)** (entidad opcional con `?` para captar el caso en que el usuario la dé en otro turno):

```ts
{
  intent: 'search_collaborators',
  // (acción buscar en español) ... (entidad en español)  → tolerante a palabras intermedias
  patterns: /(busca|búscame|buscame|necesito|quiero|quisiera|traeme|tráeme|dame|muéstrame|muestrame|listar|lista|consultar|consulta)\b.*\b(colaboradores?|empleados?|personal|trabajadores?)/i,
  confidence: 0.9
},
```

Coloca las reglas más específicas antes que las genéricas (el primer match gana). Mantén `confidence >= 0.9` para que resuelva por reglas sin llamar al LLM.

**1b (proyección + filtros).** En `extractEntities`, agrega un `case` con el nombre del intent (en inglés) que pueble dos slots a partir del catálogo. Importá el catálogo y los helpers (`import { ARTICLE_FIELDS } from '../handlers/articleFields'; import { extractFilters, extractRequestedFields } from '../handlers/FieldQuery';`):

```ts
case 'search_articles': {
  const { filters, rest } = extractFilters(message, ARTICLE_FIELDS);
  entities.filters = filters;                                     // Filter[]    → WHERE (campo + valor)
  entities.fields  = extractRequestedFields(rest, ARTICLE_FIELDS); // FieldSpec[] → SELECT (vacío = todos)
  break;
}
```

`extractFilters` corre primero y consume el texto de los filtros; `extractRequestedFields` toma el resto, así "del grupo Tecnología" cae como filtro y "código, descripción, precio lista" como proyección. Recordá que `extractRequestedFields` ya maneja "todos los campos" (→ catálogo completo) y la enumeración vacía (→ `[]`, que el handler interpreta como todos).

Si la búsqueda usa criterios sueltos (no catálogo), poblá un slot por cada criterio con su extractor; cada clave de slot va **en inglés** y queda en `null`/`undefined` si no viene:

```ts
case 'search_collaborators':
  entities.document = this.extractDocument(message);             // criterio opcional
  entities.status   = this.extractCollaboratorStatus(message);   // criterio opcional
  entities.term     = this.extractCollaboratorTerm(message);     // criterio opcional (nombres/apellidos)
  break;
```

Tipos de extractor según el dato (el regex matchea **palabras en español** del usuario, el nombre del método es en inglés):
- **Etiqueta explícita**: `message.match(/\b(?:documento|doc|dni)\s*[:#]?\s*(\d{5,})/i)` → captura "documento: 12345".
- **Patrón**: números (`\d{6,12}`), fechas, montos, emails.
- **Palabra clave / enum**: estados, categorías, monedas (mapear sinónimo en español → valor canónico).
- **Texto libre restante**: para nombres/títulos, quita del mensaje los sinónimos de la acción, la entidad, los valores ya capturados y los conectores; lo que queda es el término.

Devuelve `null` cuando el dato no aparece — **no inventes valores por defecto** para campos que el usuario debe proveer. La validación de "al menos un criterio" se hace en el handler (Paso 2).

## Paso 2 — Handler que resuelve la búsqueda

Crea un archivo nuevo en `chat.AI.API/src/core/pipeline/handlers/` (un handler por archivo). La **clase va en inglés** (`Search<Entity>Handler`, ej. `SearchCollaboratorsHandler`). Implementa `ActionHandler`.

> **Molde directo (recomendado):** copia un handler de búsqueda real ya existente del proyecto y adáptalo (tabla/campos/entidad). Usá `SearchActivitiesHandler.ts`, `SearchEmployeesHandler.ts` o `SearchParitiesHandler.ts` como referencia — ya implementan el patrón 0/1/varios + CSV con `buildCsvFilename`. Si un tipo de registro nuevo lo requiere, decláralo en `chat.AI.API/src/models/types.ts` (como `ActividadRecord`).

Elige el acceso al conector (siempre en **modo lectura**) según lo indicado:

| Conector | Cómo obtenerlo | Cómo consultar |
|----------|----------------|----------------|
| **Access DB** (SQL) | `await ConnectorFactory.getAccessDatabase()` | `db.executeQuery<T>(sql)` — solo lectura |
| **Base in-memory** (Mongo-like) | `await ConnectorFactory.getDatabase()` | `db.collection<T>('collectionName').find({...})` → `.toArray()` |
| **REST** | `await ConnectorFactory.createRestApi()` | `api.get('/ruta', { params })` → `res.data` |
| **GraphQL** | `await ConnectorFactory.createGraphQL()` | `client.query(...)` |
| **Caché** | `await ConnectorFactory.getCache()` | `cache.get/set` |

### Plantilla — Handler de búsqueda CON lógica clara (criterios sueltos)

Identificadores en inglés; mensajes al usuario en español. Los nombres de tabla/columna (`Colaboradores`, `Colab_Nombre`, …) son los **reales del esquema** y se respetan tal cual.

La rama de resultados implementa la regla: **0 → sin resultados, 1 → datos en el mensaje, varios → CSV descargable**.

```ts
import { ProcessedMessage, ActionResult } from '../../../models/types';
import { ConnectorFactory } from '../../../connectors';
import { ActionHandler } from './ActionHandlers';
import { storeCsv, toCsvString, buildCsvFilename } from './CsvStorage';

export class SearchCollaboratorsHandler implements ActionHandler {
  async handle(context: ProcessedMessage): Promise<ActionResult> {
    const { entities } = context;

    // 1. Validar que venga AL MENOS un criterio (búsqueda = OR).
    const hasCriteria = entities?.term || entities?.document || entities?.status;
    if (!hasCriteria) {
      return {
        success: false,
        needsMoreInfo: true,
        question: '¿Por qué dato querés buscar? (nombre, documento o estado)'
      };
    }

    try {
      // 2. Obtener el conector indicado y resolver los datos (lectura)
      const db = await ConnectorFactory.getAccessDatabase();
      const term = String(entities.term).replace(/'/g, "''");
      const sql = `
        SELECT TOP 100 Colab_ID, Colab_Nombre, Colab_Area
        FROM Colaboradores
        WHERE Colab_Nombre LIKE '%${term}%'
        ORDER BY Colab_Nombre
      `;
      const results = await db.executeQuery<any>(sql);

      // 3. Construir ActionResult según la cantidad de registros (message en español):

      // 3a. SIN resultados
      if (!results || results.length === 0) {
        return { success: false, message: `No encontré colaboradores que coincidan con "${entities.term}".`, data: null };
      }

      // 3b. UN solo registro → mostrar los datos en el mensaje
      if (results.length === 1) {
        const c = results[0];
        return {
          success: true,
          data: { count: 1, searchTerm: entities.term, item: c },
          message: `Encontré 1 colaborador para "${entities.term}":\n` +
                   `• ID: ${c.Colab_ID}\n• Nombre: ${c.Colab_Nombre}\n• Área: ${c.Colab_Area}`
        };
      }

      // 3c. VARIOS registros → generar CSV descargable
      const csvRows = results.map((c: any) => ({
        id: c.Colab_ID,
        nombre: c.Colab_Nombre,
        area: c.Colab_Area
      }));
      // Nombre del CSV = entidad + criterios usados + fecha (ver "Convención de nombre del CSV").
      const filename = buildCsvFilename('colaboradores', {
        documento: entities.document,
        estado:    entities.status,
        nombre:    entities.term,
      });
      const csvId = storeCsv(toCsvString(csvRows), filename);

      return {
        success: true,
        multipleResults: true,
        csvDownloadId: csvId,
        data: { count: results.length, searchTerm: entities.term },
        message: `Encontré ${results.length} colaboradores para "${entities.term}". Podés descargar la lista completa.`
      };
    } catch (error: any) {
      console.error('[SearchCollaboratorsHandler] Error:', error.message);
      return { success: false, message: 'Ocurrió un error al consultar. Intenta nuevamente.', data: { error: error.message } };
    }
  }
}
```

### Plantilla — Handler de búsqueda con proyección + filtros (catálogo de campos)

Para búsquedas donde el usuario elige **qué devolver** y **por qué filtrar**, el handler arma el `SELECT` desde la proyección y el `WHERE` desde los filtros, usando el catálogo del Paso 1b. Si la proyección viene vacía, devuelve **todos** los campos del catálogo.

```ts
import { ProcessedMessage, ActionResult } from '../../../models/types';
import { ConnectorFactory } from '../../../connectors';
import { ActionHandler } from './ActionHandlers';
import { storeCsv, toCsvString, buildCsvFilename } from './CsvStorage';
import { FieldSpec, Filter } from './FieldQuery';
import { ARTICLE_FIELDS } from './articleFields';

export class SearchArticlesHandler implements ActionHandler {
  async handle(context: ProcessedMessage): Promise<ActionResult> {
    const { entities } = context;

    // Proyección: lo pedido, o TODO el catálogo si no nombró campos.
    const fields: FieldSpec[] = entities?.fields?.length ? entities.fields : ARTICLE_FIELDS;
    const filters: Filter[] = entities?.filters ?? [];

    // Búsqueda = al menos un filtro.
    if (filters.length === 0) {
      const question = '¿Por qué dato querés filtrar los artículos? (ej. grupo, código o descripción)';
      return { success: false, needsMoreInfo: true, question, message: question };
    }

    try {
      const db = await ConnectorFactory.getAccessDatabase();

      const select = fields.map(f => f.column).join(', ');
      const where = filters.map(f =>
        f.field.type === 'number'
          ? `${f.field.column} = ${Number(f.value)}`
          : `${f.field.column} LIKE '%${String(f.value).replace(/'/g, "''")}%'`
      ).join(' AND ');

      const sql = `SELECT ${select} FROM Articulos WHERE ${where} ORDER BY ${fields[0].column}`;
      const results = await db.executeQuery<any>(sql);

      const filterLabel = filters.map(f => `${f.field.label} ${f.value}`).join(', ');

      // 0 → sin resultados
      if (!results || results.length === 0) {
        return { success: false, message: `No encontré artículos para ${filterLabel}.`, data: null };
      }

      // 1 → datos en el mensaje (solo las columnas pedidas)
      if (results.length === 1) {
        const row = results[0];
        const detail = fields.map(f => `• ${f.label}: ${row[f.column]}`).join('\n');
        return {
          success: true,
          data: { count: 1, searchTerm: filterLabel, item: row },
          message: `Encontré 1 artículo para ${filterLabel}:\n${detail}`
        };
      }

      // varios → CSV descargable (encabezados = etiquetas de los campos pedidos)
      const csvRows = results.map((row: any) => {
        const o: Record<string, any> = {};
        for (const f of fields) o[f.label] = row[f.column];
        return o;
      });
      const filename = buildCsvFilename(
        'articulos',
        Object.fromEntries(filters.map(f => [f.field.label, f.value]))
      );
      const csvId = storeCsv(toCsvString(csvRows), filename);

      return {
        success: true,
        multipleResults: true,
        csvDownloadId: csvId,
        data: { count: results.length, searchTerm: filterLabel },
        message: `Encontré ${results.length} artículos para ${filterLabel}. Podés descargar la lista completa.`
      };
    } catch (error: any) {
      console.error('[SearchArticlesHandler] Error:', error.message);
      return { success: false, message: 'Ocurrió un error al consultar los artículos. Intentá nuevamente.', data: { error: error.message } };
    }
  }
}
```

> El CSV y el detalle usan **solo las columnas de la proyección** (`fields`), y sus encabezados salen de `f.label` (español). El `WHERE` sale de `filters` (campo real + valor, quoteado/numérico según `f.type`).

### Convención de nombre del CSV (IMPORTANTE)

El `filename` que se pasa a `storeCsv` es lo que el usuario verá al descargar, así que **debe describir con claridad qué contiene el archivo**: la **entidad** consultada y el **criterio** de búsqueda aplicado. **Nunca** uses el objeto `entities` completo ni interpolaciones crudas (`productos_${entities}.csv` produce `productos_[object Object].csv`).

**Formato:** `<entidad-plural>_<criterio>_<fecha>.csv`

- **entidad-plural**: la entidad en español y en plural (`colaboradores`, `productos`, `facturas`). Es la palabra que ancla de qué es el listado.
- **criterio**: los filtros realmente usados, como pares `campo-valor` unidos por `_` (ej. `nombre-ana-perez`, `estado-activo`, `documento-12345678`). Si no se aplicó ningún filtro (listado completo), usar `todos`. Refleja **solo** los criterios con valor; omití los `null`/vacíos.
- **fecha**: `YYYY-MM-DD` del momento de la consulta, para que el archivo sea único y trazable.

Ejemplos: `colaboradores_nombre-ana-perez_estado-activo_2026-06-24.csv`, `productos_documento-12345678_2026-06-24.csv`, `facturas_todos_2026-06-24.csv`.

Usá este **helper reutilizable** (mantenelo junto a los handlers, p. ej. en `CsvStorage.ts`, y reusalo en todos): normaliza acentos, baja a minúsculas y sanea caracteres para un nombre de archivo seguro.

```ts
/** Construye un nombre de CSV claro: entidad + criterios usados + fecha (YYYY-MM-DD). */
export function buildCsvFilename(entity: string, criteria: Record<string, any>): string {
  const slug = (v: any) =>
    String(v).normalize('NFD').replace(/[̀-ͯ]/g, '')   // saca acentos
      .toLowerCase().replace(/[^a-z0-9]+/g, '-')                 // a-z0-9 → guiones
      .replace(/^-+|-+$/g, '').slice(0, 40);                     // recorta extremos y largo
  const parts = Object.entries(criteria)
    .filter(([, v]) => v != null && String(v).trim() !== '')      // solo criterios con valor
    .map(([k, v]) => `${k}-${slug(v)}`);
  const date = new Date().toISOString().slice(0, 10);             // YYYY-MM-DD
  return `${entity}_${parts.join('_') || 'todos'}_${date}.csv`;
}
```

Las **claves** del objeto `criteria` van en **español** (las lee el usuario en el nombre del archivo), aunque los slots de `entities` se llamen en inglés: por eso en la plantilla se mapea `{ documento: entities.document, estado: entities.status, ... }`. Incluí en `criteria` los mismos filtros que efectivamente usaste en la query.

> **CSV solo cuando hay varios:** generá el `csvDownloadId` **únicamente** en la rama de más de un registro. Con 1 registro mostrá los campos en el `message` y **no** setees `multipleResults`/`csvDownloadId`. `ResponseGeneratorStage` adjunta el CSV automáticamente cuando ve `multipleResults && csvDownloadId` (ver Paso 4). En las claves del CSV (`toCsvString`) podés usar encabezados en español porque son texto que lee el usuario, no identificadores de código.

### Plantilla — Handler SIN lógica definida

Úsala cuando la fuente/campos no estén claros. Genera el flujo pero avisa que no puede resolver:

```ts
export class SearchCollaboratorsHandler implements ActionHandler {
  async handle(context: ProcessedMessage): Promise<ActionResult> {
    // TODO: definir conector, tabla/endpoint y campos a devolver.
    return {
      success: false,
      message: 'Entendí que quieres buscar colaboradores, pero todavía no tengo configurada la fuente de datos para resolverlo. Falta definir de dónde se obtienen (tabla/endpoint) y qué campos mostrar.',
      data: null
    };
  }
}
```

> Para `ActionResult`, los campos disponibles están en `chat.AI.API/src/models/types.ts` (`success`, `data`, `message`, `needsMoreInfo`, `question`, `multipleResults`, `csvDownloadId`, etc.). Para muchos resultados se puede generar un CSV con `storeCsv`/`toCsvString` de `./CsvStorage` (ver `PriceQueryHandler`).

## Paso 3 — Registrar el handler

Archivo: `chat.AI.API/src/core/pipeline/stages/ActionRouterStage.ts`

1. Importa el handler (si es archivo nuevo, expórtalo desde `ActionHandlers.ts` con `export { SearchCollaboratorsHandler } from './SearchCollaboratorsHandler';`, igual que `ParityQueryHandler`, o impórtalo directo).
2. En `registerHandlers()` agrega: `this.handlers.set('search_collaborators', new SearchCollaboratorsHandler());`

El nombre del `set` debe ser **idéntico** al `intent` (en inglés) de la regla del Paso 1.

## Paso 4 — Respuesta

Archivo: `chat.AI.API/src/core/pipeline/stages/ResponseGeneratorStage.ts`

- Si el **handler ya arma el `message` final** (recomendado), agrega el intent al array `simpleIntents` en `selectStrategy` para que use estrategia `template` y devuelva el mensaje tal cual:
  ```ts
  const simpleIntents = ['saludo', 'despedida', 'search_parity', 'search_employees', 'search_activities', 'search_collaborators'];
  ```
  Agrega el nuevo intent en inglés. **⚠️ Verifica el array primero:** los valores deben coincidir **exactamente** con los nombres de intent reales (en inglés) del Paso 1. Si encuentras valores obsoletos que no matchean ningún intent (p. ej. `'day_parity'`, `'buscar_colaboradores'`), corrígelos — un intent que no esté aquí **no responde por template** (cae en `hybrid`/`llm`) y el chat puede no devolver el mensaje del handler.
- **CSV (varios registros):** no requiere configuración extra. Cuando el handler devuelve `multipleResults: true` + `csvDownloadId`, `ResponseGeneratorStage` adjunta automáticamente `{ type: 'csv', id: csvDownloadId }` a la respuesta. Con la estrategia `template`, el caso `multipleResults` ya emite un mensaje de "se encontraron N… podés descargar la lista"; si querés un texto propio, ese mensaje del handler se usa igual. Para **1 registro** no hay adjunto: se muestra el `message` con los datos.
- Si quieres una respuesta con **placeholders**, agrega un template en `generateFromTemplate` (`templates`) usando `{campo}` que existan en `actionResult.data`.
- Si la respuesta debe ser **redactada por el LLM** con los datos, no lo agregues a `simpleIntents`: caerá en estrategia `llm`/`hybrid` y `buildContextPrompt` le pasará `actionResult.data`.

## Paso 5 — Compilar, corregir y ejecutar (OBLIGATORIO)

Al terminar los pasos 1–4, **siempre** ejecuta esta secuencia completa; no la des por terminada hasta que el proyecto compile sin errores y quede corriendo.

1. **Compilar** desde `chat.AI.API`: `npm run build` (corre `tsc` + copia `public`).
2. **Corregir errores en bucle hasta que no quede ninguno:** si `npm run build` reporta errores de TypeScript, léelos, corrígelos en el código y **vuelve a compilar**. Repite hasta que la compilación termine **sin ningún error**. No avances al paso siguiente con errores pendientes.
3. **Ejecutar el proyecto** para que el usuario lo pruebe: corre `npm start` (sirve `dist/` ya compilado) **en segundo plano** para que el server quede levantado. Alternativa en desarrollo: `npm run dev` (ts-node, sin build previo).
4. **Reportar al usuario** que ya puede probar, incluyendo:
   - La **URL** donde quedó corriendo: por defecto `http://localhost:3000` (chat UI), `http://localhost:3000/api/health` (health). El puerto sale de `PORT` (default `3000`).
   - El **nombre del intent** creado, los **sinónimos** cubiertos, el **conector** usado y **si la lógica de datos quedó implementada o pendiente** (plantilla "sin lógica").
   - Una **frase de ejemplo** para disparar el intent (ej. "muéstrame las actividades de soldadura") así el usuario lo prueba de inmediato.

> Si el puerto `3000` ya está en uso (el server lo informa con `Port 3000 is already in use`), avisá al usuario para que cierre la instancia previa o definí otro puerto con `PORT`.

## Checklist final

- [ ] Es una intención de **BÚSQUEDA** (lectura). Si es Crear/Agregar/Modificar/Eliminar/Borrar → usar la skill de esa acción, no esta
- [ ] **Nombres de intent, clases, métodos, variables y slots en inglés**; sinónimos regex y mensajes al usuario en español
- [ ] **Catálogo de campos completo** declarado (todos los campos: clave en inglés, columna real, etiqueta, sinónimos, `filterable`, `type`)
- [ ] Regla en `classifyWithRules` con `intent` en inglés (`search_<entity>`) y sinónimos en español de la acción buscar + entidad (`confidence >= 0.9`)
- [ ] `case` en `extractEntities` con slots `fields` (proyección, vacío = todos; "todos los campos" = catálogo completo) y `filters` (campo + valor) poblados con `extractRequestedFields`/`extractFilters`, o un slot por criterio suelto (`null` si no viene)
- [ ] Handler valida que venga **al menos un criterio** (OR) y pide el faltante con `needsMoreInfo`; arma `SELECT` desde la proyección y `WHERE` desde los filtros
- [ ] **Resultado:** 0 registros → sin resultados; **1 registro → datos en el `message`**; **varios → `multipleResults` + `csvDownloadId`** (CSV descargable, no se vuelca al texto)
- [ ] **Nombre del CSV** generado con `buildCsvFilename(entidad, criterios)` → `<entidad-plural>_<criterio>_<fecha>.csv` (claro y ligado a lo buscado; nunca `${entities}` crudo)
- [ ] Handler creado (con lógica real, o avisando que no puede resolver) y registrado en `ActionRouterStage` con el nombre exacto del intent (en inglés)
- [ ] Estrategia de respuesta definida en `ResponseGeneratorStage` (array `simpleIntents` sin valores obsoletos)
- [ ] **Compila sin errores** (`npm run build`), corrigiendo en bucle hasta que no quede ninguno
- [ ] **Proyecto ejecutándose** (`npm start` / `npm run dev`) y se reportó al usuario la URL, el intent, el conector y una frase de ejemplo para probar
