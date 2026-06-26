/**
 * Search Employees Handler
 * Busca colaboradores a través del conector GraphQL.
 * Permite filtrar por nombres, apellidos, estado y documento.
 */

import { ProcessedMessage, ActionResult, EmpleadoRecord } from '../../../../models/types';
import { ConnectorFactory } from '../../../../connectors';
import { ActionHandler } from '../ActionHandlers';
import { storeCsv, toCsvString, buildCsvFilename } from '../../../utils/tools/CsvStorage';

interface Colaborador {
  id: string;
  nombres: string;
  apellidos: string;
  documento: string;
  estado: string;
}

export class SearchEmployeesHandler implements ActionHandler {
  async handle(context: ProcessedMessage): Promise<ActionResult> {
    const { entities } = context;

    const termino = (entities?.termino as string) || '';
    const estado = (entities?.estado as string) || null;
    const documento = (entities?.documento as string) || null;

    // LOGICA PARA BUSCAR LOS DATOS


    try {
      const accessDb = await ConnectorFactory.getAccessUtilitiesDatabase();
      let sql: string;
      // LOGICA PARA BUSCAR LOS DATOS
     sql = `
          SELECT 
            Empleado_Codigo,
            Empleado_Nombre,
            Empleado_Apellido,
            Empleado_DNI,
            Empleado_Vinculado
          FROM Empleados
        `;
      let whereClauses: string[] = [];
      if (termino) {
        const term = termino.replace(/'/g, "''");
        whereClauses.push(`(Empleado_Nombre LIKE '%${term}%' OR Empleado_Apellido LIKE '%${term}%')`);
      }
      if (estado) {
        const est = estado.replace(/'/g, "''");
        whereClauses.push(`Empleado_Vinculado = '${est}'`);
      }
      if (documento) {
        const doc = documento.replace(/'/g, "''");
        whereClauses.push(`Empleado_DNI LIKE '%${doc}%'`);
      }

      if (whereClauses.length > 0) {
        sql += `                
                WHERE ${whereClauses.join(' AND ')}
                ORDER BY Empleado_Codigo
              `;
      } else {
        sql += `ORDER BY Empleado_Codigo`;
      }
      
      const results = await accessDb.executeQuery<EmpleadoRecord>(sql);

      const colaboradores = results ?? [];

      const criterio = [
        termino ? `"${termino}"` : null,
        estado ? `estado ${estado}` : null,
        documento ? `DNI ${documento}` : null
      ].filter(Boolean).join(', ');

      // 0 registros → sin resultados
      if (colaboradores.length === 0) {
        return {
          success: false,
          message: `No encontré colaboradores que coincidan con la búsqueda (${criterio}).`,
          data: null
        };
      }

      // 1 registro → mostrar los datos en el mensaje
      if (colaboradores.length === 1) {
        const c = colaboradores[0];
        return {
          success: true,
          data: { count: 1, criterio, item: c },
          message: `Encontré 1 colaborador (${criterio}):\n` +
            `• Nombre: ${c.Empleado_Nombre} ${c.Empleado_Apellido}\n• Documento: ${c.Empleado_DNI}\n• Estado: ${c.Empleado_Vinculado}`
        };
      }

      // Varios registros → generar CSV descargable
      const csvRows = colaboradores.map(c => ({
        Nombre: c.Empleado_Nombre,
        Apellidos: c.Empleado_Apellido,
        DNI: c.Empleado_DNI,
        Estado: c.Empleado_Vinculado
      }));
      const filename = buildCsvFilename('colaboradores', {
        nombre: termino,
        documento,
        estado
      });
      const csvId = storeCsv(toCsvString(csvRows), filename);

      return {
        success: true,
        multipleResults: true,
        csvDownloadId: csvId,
        data: { count: colaboradores.length, criterio },
        message: `Encontré ${colaboradores.length} colaboradores (${criterio}). Podés descargar la lista completa.`
      };
    } catch (error: any) {
      console.error('[SearchEmployeesHandler] Error:', error.message);
      return {
        success: false,
        message: 'Ocurrió un error al buscar colaboradores. Intentá nuevamente.',
        data: { error: error.message }
      };
    }
  }
}
