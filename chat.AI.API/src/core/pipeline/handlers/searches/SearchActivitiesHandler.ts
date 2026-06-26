/**
 * Search Activities Handler
 * Busca actividades en la tabla `Actividades` de la base Access `Utilidades.mdb`.
 *
 * El usuario elige en el mismo mensaje DOS listas independientes (ver `actividadFields.ts`):
 *   - Campos a devolver (proyección): qué columnas mostrar. Vacío → código + descripción;
 *     "todos los campos" → catálogo completo.
 *   - Campos de filtro (campo + valor): por qué acotar. Se combinan con AND.
 *
 * Además admite una BÚSQUEDA POR TÉRMINO LIBRE (entities.termino) que matchea el código o
 * la descripción, para pedidos como "busca las actividades de soldadura". Si no hay ni
 * filtros ni término (p. ej. "quiero código, descripción y color de las actividades"),
 * se listan TODAS las actividades con la proyección elegida.
 *
 * Los nombres de columnas son los reales del esquema (verificado por ADODB; ver ACTIVIDAD_FIELDS).
 */

import { ProcessedMessage, ActionResult } from '../../../../models/types';
import { ConnectorFactory } from '../../../../connectors';
import { ActionHandler } from '../ActionHandlers';
import { storeCsv, toCsvString, buildCsvFilename } from '../../../utils/tools/CsvStorage';
import { FieldSpec, Filter } from '../../../utils/helpers/FieldQuery';
import { ACTIVIDAD_FIELDS, ACTIVIDAD_DEFAULT_FIELDS } from '../../../utils/fields/actividadFields';

export class SearchActivitiesHandler implements ActionHandler {
  async handle(context: ProcessedMessage): Promise<ActionResult> {
    const { entities } = context;

    // Proyección: lo pedido, o el subconjunto por defecto (código + descripción) si no nombró campos.
    const fields: FieldSpec[] = entities?.fields?.length ? entities.fields : ACTIVIDAD_DEFAULT_FIELDS;
    const filters: Filter[] = entities?.filters ?? [];
    const termino = (entities?.termino as string)?.trim() || '';

    try {
      const accessDb = await ConnectorFactory.getAccessUtilitiesDatabase();

      const select = fields.map(f => f.column).join(', ');

      // WHERE: filtros por campo (AND) tienen prioridad; si no hay, término libre sobre
      // código/descripción; si tampoco hay término, se listan TODAS las actividades.
      let where = '';
      let scope = '';
      if (filters.length > 0) {
        where =
          'WHERE ' +
          filters
            .map(f =>
              f.field.type === 'number'
                ? `${f.field.column} = ${Number(f.value)}`
                : `${f.field.column} LIKE '%${String(f.value).replace(/'/g, "''")}%'`
            )
            .join(' AND ');
        scope = ` para ${filters.map(f => `${f.field.label} ${f.value}`).join(', ')}`;
      } else if (termino) {
        const term = termino.replace(/'/g, "''");
        where = `WHERE (Actividad_Codigo LIKE '%${term}%' OR Actividad_Descripcion LIKE '%${term}%')`;
        scope = ` para "${termino}"`;
      }

      const sql = `SELECT ${select} FROM Actividades ${where} ORDER BY Actividad_Codigo`;
      const results = await accessDb.executeQuery<Record<string, any>>(sql);

      // 0 registros → sin resultados
      if (!results || results.length === 0) {
        return {
          success: false,
          message: `No encontré actividades${scope}.`,
          data: null
        };
      }

      // 1 registro → mostrar los campos pedidos en el mensaje
      if (results.length === 1) {
        const row = results[0];
        const detail = fields.map(f => `• ${f.label}: ${formatValue(row[f.column])}`).join('\n');
        return {
          success: true,
          data: { count: 1, searchTerm: scope.trim(), item: row },
          message: `Encontré 1 actividad${scope}:\n${detail}`
        };
      }

      // Varios registros → generar CSV descargable (solo las columnas pedidas)
      const csvRows = results.map(row => {
        const o: Record<string, any> = {};
        for (const f of fields) o[f.label] = formatValue(row[f.column]);
        return o;
      });
      const criteria =
        filters.length > 0
          ? Object.fromEntries(filters.map(f => [f.field.label, f.value]))
          : termino
            ? { termino }
            : {}; // sin criterios → buildCsvFilename usa "todos"
      const filename = buildCsvFilename('actividades', criteria);
      const csvId = storeCsv(toCsvString(csvRows), filename);

      return {
        success: true,
        multipleResults: true,
        csvDownloadId: csvId,
        data: { count: results.length, searchTerm: scope.trim() },
        message: `Encontré ${results.length} actividades${scope}. Podés descargar la lista completa.`
      };
    } catch (error: any) {
      console.error('[SearchActivitiesHandler] Error:', error.message);
      return {
        success: false,
        message: 'Ocurrió un error al consultar las actividades. Intentá nuevamente.',
        data: { error: error.message }
      };
    }
  }
}

/** Quita el marcado RTF de un texto crudo ({\rtf1\ansi...}) y devuelve el texto plano. */
function stripRtf(value: string): string {
  let s = value;
  if (!/\\rtf|\\ansi|\\deff\d/.test(s)) return s.trim(); // no parece RTF
  s = s.replace(/\{\\\*?[^{}]*}/g, ' ');      // grupos de control {\*\...}
  s = s.replace(/\\'[0-9a-fA-F]{2}/g, ' ');   // caracteres escapados \'xx
  s = s.replace(/\\[a-zA-Z]+-?\d* ?/g, ' ');  // palabras de control \word, \word-12
  s = s.replace(/[{}]/g, ' ');                // llaves sueltas
  return s.replace(/\s+/g, ' ').trim();
}

/** Formatea valores para mostrar al usuario (RTF → texto, null → vacío). */
function formatValue(v: any): string {
  if (v == null) return '';
  if (typeof v === 'string') return stripRtf(v);
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  return String(v);
}
