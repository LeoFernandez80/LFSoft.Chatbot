/**
 * Search Texts Handler
 * Busca textos en Access DB (tabla Textos) filtrando por un término libre que
 * matchea el código, la descripción general o el detalle del texto.
 *
 * Columnas reales del esquema: Texto_Codigo, Texto_DescripcionGeneral,
 * Texto_Detalle, Texto_DetalleRTF, Texto_Tipo, Texto_Clasificacion.
 * Se omite Texto_DetalleRTF en la consulta por ser marcado RTF crudo.
 */

import { ProcessedMessage, ActionResult, TextoRecord } from '../../../../models/types';
import { ConnectorFactory } from '../../../../connectors';
import { ActionHandler } from '../ActionHandlers';
import { storeCsv, toCsvString, buildCsvFilename } from '../../../utils/tools/CsvStorage';

export class SearchTextsHandler implements ActionHandler {
  async handle(context: ProcessedMessage): Promise<ActionResult> {
    const { entities } = context;

    const termino = (entities?.termino as string)?.trim() || '';

    try {
      const accessDb = await ConnectorFactory.getAccessUtilitiesDatabase();

      const term = termino.replace(/'/g, "''");
      let sql = `SELECT
            Texto_Codigo,
            Texto_DescripcionGeneral,
            Texto_Detalle,
            Texto_Tipo,
            Texto_Clasificacion
          FROM Textos
          `;
      let whereClauses: string[] = [];
      if (term) {
        whereClauses.push(`Texto_Codigo LIKE '%${term}%' OR Texto_DescripcionGeneral LIKE '%${term}%' OR Texto_Detalle LIKE '%${term}%'`);
      }
      if (whereClauses.length > 0) {
        sql += `WHERE ${whereClauses.join(' OR ')} ORDER BY Texto_Codigo`;
      } else {
        sql += `ORDER BY Texto_Codigo`;
      }

      const results = await accessDb.executeQuery<TextoRecord>(sql);

      // 0 registros → sin resultados
      if (!results || results.length === 0) {
        return {
          success: false,
          message: `No encontré textos que coincidan con "${termino}".`,
          data: null
        };
      }

      // 1 registro → mostrar los datos en el mensaje
      if (results.length === 1) {
        const t = results[0];
        return {
          success: true,
          data: { count: 1, searchTerm: termino, item: t },
          message: `Encontré 1 texto para "${termino}":\n` +
            `• Código: ${t.Texto_Codigo}\n` +
            `• Descripción: ${t.Texto_DescripcionGeneral}\n` +
            `• Detalle: ${t.Texto_Detalle}\n` +
            `• Tipo: ${t.Texto_Tipo}\n` +
            `• Clasificación: ${t.Texto_Clasificacion}`
        };
      }

      // Varios registros → generar CSV descargable
      const csvRows = results.map(t => ({
        codigo: t.Texto_Codigo,
        descripcion: t.Texto_DescripcionGeneral,
        detalle: t.Texto_Detalle,
        tipo: t.Texto_Tipo,
        clasificacion: t.Texto_Clasificacion
      }));
      const filename = buildCsvFilename('textos', { termino });
      const csvId = storeCsv(toCsvString(csvRows), filename);

      return {
        success: true,
        multipleResults: true,
        csvDownloadId: csvId,
        data: { count: results.length, searchTerm: termino },
        message: `Encontré ${results.length} textos para "${termino}". Podés descargar la lista completa.`
      };
    } catch (error: any) {
      console.error('[SearchTextsHandler] Error:', error.message);
      return {
        success: false,
        message: 'Ocurrió un error al consultar los textos. Intentá nuevamente.',
        data: { error: error.message }
      };
    }
  }
}
