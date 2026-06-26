/**
 * Search Criteria Handler
 * Busca criterios en la tabla `Criterios` de la base Access `Criterios.mdb`.
 *
 * El usuario elige en el mismo mensaje DOS listas independientes (ver `criterioFields.ts`):
 *   - Campos a devolver (proyección): qué columnas mostrar. Vacío → todas.
 *   - Campos de filtro (campo + valor): por qué acotar. Se combinan con AND.
 *
 * Ej: "quiero la descripción, el descuento y la moneda de los criterios del grupo 28"
 *      → devolver [descripción, descuento, moneda]; filtrar Criterio_Grupo_Codigo = 28.
 *
 * Los nombres de columnas son los reales del esquema (ver `CRITERIO_FIELDS`).
 */

import { ProcessedMessage, ActionResult } from '../../../../models/types';
import { ConnectorFactory } from '../../../../connectors';
import { ActionHandler } from '../ActionHandlers';
import { storeCsv, toCsvString, buildCsvFilename } from '../../../utils/tools/CsvStorage';
import { FieldSpec, Filter } from '../../../utils/helpers/FieldQuery';
import { CRITERIO_FIELDS } from '../../../utils/fields/criterioFields';

export class SearchCriteriaHandler implements ActionHandler {
  async handle(context: ProcessedMessage): Promise<ActionResult> {
    const { entities } = context;

    // Proyección: lo pedido, o TODO el catálogo si no nombró campos.
    const fields: FieldSpec[] = entities?.fields?.length ? entities.fields : CRITERIO_FIELDS;
    const filters: Filter[] = entities?.filters ?? [];

    // BUSCAR: el requerido mínimo es al menos un filtro.
    if (filters.length === 0) {
      const question =
        '¿Por qué dato querés filtrar los criterios? (ej. lista de precios, familia, grupo, subgrupo, nombre o descripción)';
      return { success: false, needsMoreInfo: true, question, message: question };
    }

    try {
      const accessDb = await ConnectorFactory.getAccessCriteriosDatabase();

      const select = fields.map(f => f.column).join(', ');
      const where = filters
        .map(f =>
          f.field.type === 'number'
            ? `${f.field.column} = ${Number(f.value)}`
            : `${f.field.column} LIKE '%${String(f.value).replace(/'/g, "''")}%'`
        )
        .join(' AND ');

      const sql = `SELECT ${select} FROM Criterios WHERE ${where} ORDER BY ${fields[0].column}`;
      const results = await accessDb.executeQuery<Record<string, any>>(sql);

      // Descripción legible de los filtros usados (para los mensajes al usuario).
      const filterLabel = filters.map(f => `${f.field.label} ${f.value}`).join(', ');

      // 0 registros → sin resultados
      if (!results || results.length === 0) {
        return {
          success: false,
          message: `No encontré criterios que coincidan con ${filterLabel}.`,
          data: null
        };
      }

      // 1 registro → mostrar los campos pedidos en el mensaje
      if (results.length === 1) {
        const row = results[0];
        const detail = fields.map(f => `• ${f.label}: ${formatValue(row[f.column])}`).join('\n');
        return {
          success: true,
          data: { count: 1, searchTerm: filterLabel, item: row },
          message: `Encontré 1 criterio para ${filterLabel}:\n${detail}`
        };
      }

      // Varios registros → generar CSV descargable (solo las columnas pedidas)
      const csvRows = results.map(row => {
        const o: Record<string, any> = {};
        for (const f of fields) o[f.label] = formatValue(row[f.column]);
        return o;
      });
      const filename = buildCsvFilename(
        'criterios',
        Object.fromEntries(filters.map(f => [f.field.label, f.value]))
      );
      const csvId = storeCsv(toCsvString(csvRows), filename);

      return {
        success: true,
        multipleResults: true,
        csvDownloadId: csvId,
        data: { count: results.length, searchTerm: filterLabel },
        message: `Encontré ${results.length} criterios para ${filterLabel}. Podés descargar la lista completa.`
      };
    } catch (error: any) {
      console.error('[SearchCriteriaHandler] Error:', error.message);
      return {
        success: false,
        message: 'Ocurrió un error al consultar los criterios. Intentá nuevamente.',
        data: { error: error.message }
      };
    }
  }
}

/** Formatea valores para mostrar al usuario (booleanos → Sí/No, null → vacío). */
function formatValue(v: any): string {
  if (v == null) return '';
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  return String(v);
}
