/**
 * Parity Query Handler
 * Maneja consultas de paridad cambiaria desde Access DB
 */

import { ProcessedMessage, ActionResult, ParityRecord, CurrencyType } from '../../../../models/types';
import { ConnectorFactory } from '../../../../connectors';
import { log } from 'util';
import { storeCsv, toCsvString, buildCsvFilename } from '../../../utils/tools/CsvStorage';

export interface ActionHandler {
  handle(context: ProcessedMessage): Promise<ActionResult>;
}

/**
 * Handler: Consulta de Paridad Cambiaria
 */
export class SearchParitiesHandler implements ActionHandler {
  async handle(context: ProcessedMessage): Promise<ActionResult> {
    const { entities } = context;

    try {
      // Obtener conexión a Access DB
      const accessDb = await ConnectorFactory.getAccessUtilitiesDatabase();

      // LOGICA PARA BUSCAR LOS DATOS

      // Determinar qué moneda consultar
      const currency: CurrencyType = (entities?.moneda as CurrencyType) || 'AMBAS';

      // Determinar si se solicitó una fecha específica (formato 'yyyy-mm-dd')
      const fecha: string | null = (entities?.fecha as string) || null;

      // Construir query: por fecha dada o última paridad disponible
      let sql: string;
      sql = `
          SELECT
            Paridad_fecha,
            Paridad_FechaCorrespondeA,
            Paridad_DOLAR,
            Paridad_EURO
          FROM Paridades
           `;
      let whereClauses: string[] = [];
      if (fecha) {
        whereClauses.push(`Paridad_FechaCorrespondeA = #${fecha}#`);
      }
      if (whereClauses.length > 0) {
        sql += `WHERE ${whereClauses.join(' AND ')} ORDER BY Paridad_fecha DESC`;
      } else {
        sql += `ORDER BY Paridad_fecha DESC`;
      }

      const results = await accessDb.executeQuery<ParityRecord>(sql);

      if (!results || results.length === 0) {
        return {
          success: false,
          message: fecha
            ? `No hay datos de paridad disponibles para la fecha ${this.formatDate(fecha)}.`
            : 'No hay datos de paridad disponibles en este momento.',
          data: null
        };
      }

      if (results.length > 1) {
        const csvRows = results.map(p => ({
          Fecha: p.Paridad_fecha,
          CorrespondeA: p.Paridad_FechaCorrespondeA,
          Dolar: p.Paridad_DOLAR,
          Euro: p.Paridad_EURO
        }));
        const filename = buildCsvFilename('paridades', {
          fecha,
          moneda: currency !== 'AMBAS' ? currency : null
        });
        const csvId = storeCsv(toCsvString(csvRows), filename);

        return {
          success: true,
          multipleResults: true,
          csvDownloadId: csvId,
          data: {
            count: results.length,
            searchTerm: entities?.fecha
          },
          message: fecha
            ? `Encontré ${results.length} paridades para la fecha ${this.formatDate(fecha)}. Podés descargar la lista completa.`
            : `Encontré ${results.length} paridades disponibles. Podés descargar la lista completa.`
        };
      }

      const parity = results[0];

      // Texto de fecha a la que corresponde la paridad encontrada
      const fechaTexto = this.formatDate(parity.Paridad_FechaCorrespondeA);

      // Formatear respuesta según moneda solicitada
      let responseData: any;
      let message: string;

      switch (currency) {
        case 'DOLAR':
          responseData = {
            moneda: 'USD',
            valor: parity.Paridad_DOLAR,
            fecha: parity.Paridad_fecha,
            fechaCorrespondeA: parity.Paridad_FechaCorrespondeA
          };
          message = `La paridad del dólar al ${fechaTexto} es $${parity.Paridad_DOLAR.toFixed(2)}`;
          break;

        case 'EURO':
          responseData = {
            moneda: 'EUR',
            valor: parity.Paridad_EURO,
            fecha: parity.Paridad_fecha,
            fechaCorrespondeA: parity.Paridad_FechaCorrespondeA
          };
          message = `La paridad del euro al ${fechaTexto} es $${parity.Paridad_EURO.toFixed(2)}`;
          break;

        case 'AMBAS':
        default:
          responseData = {
            dolar: parity.Paridad_DOLAR,
            euro: parity.Paridad_EURO,
            fecha: parity.Paridad_fecha,
            fechaCorrespondeA: parity.Paridad_FechaCorrespondeA
          };
          message = `Paridades al ${fechaTexto}: Dólar $${parity.Paridad_DOLAR.toFixed(2)} | Euro $${parity.Paridad_EURO.toFixed(2)}`;
          break;
      }

      return {
        success: true,
        data: responseData,
        message
      };
    } catch (error: any) {
      console.error('[ParityQueryHandler] Error:', error.message);
      return {
        success: false,
        message: 'Ocurrió un error al consultar la paridad. Por favor, intenta nuevamente.',
        data: { error: error.message }
      };
    }
  }

  /**
   * Suma días a una fecha 'yyyy-mm-dd' y devuelve el resultado en el mismo formato.
   */
  private addDays(isoDate: string, days: number): string {
    const [y, m, d] = isoDate.split('-').map(Number);
    const date = new Date(y, m - 1, d + days);
    const yy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  }

  /**
   * Formatea una fecha (Date o string 'yyyy-mm-dd') como 'dd/mm/yyyy' para mostrar.
   */
  private formatDate(value: Date | string): string {
    // Un string 'yyyy-mm-dd' debe interpretarse como fecha local; new Date(str)
    // lo tomaría como UTC y restaría un día en zonas horarias negativas.
    if (typeof value === 'string') {
      const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    }
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return String(value);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
}
