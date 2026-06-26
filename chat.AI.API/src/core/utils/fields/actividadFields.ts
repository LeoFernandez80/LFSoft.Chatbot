/**
 * Catálogo de campos de la entidad Actividades (tabla `Actividades` de `Utilidades.mdb`).
 *
 * Declara TODOS los campos del esquema real (verificado contra la base por ADODB):
 * clave en inglés (slot), columna real, etiqueta en español (CSV/mensaje), sinónimos
 * en español, si es filtrable y su tipo. Habilita la proyección (qué devolver) y los
 * filtros (por qué filtrar).
 *
 * Esquema real de la tabla:
 *   Actividad_Codigo            String  (PK, ej. "APRA01")
 *   Actividad_Descripcion       String
 *   Actividad_Representa        Byte    (número)
 *   Actividad_Observaciones     String
 *   Actividad_ColorHojaRGB      Int32   (color, número RGB)
 *   Actividad_Definicion        String  (RTF)
 *   Actividad_Implica           Int32   (número)
 *   Actividad_ImplicaProvisorio String  (RTF)
 *   Actividad_PTGNumero         Int32   (número)
 *   Actividad_PTGVersion        Byte    (número)
 *
 * Notas de orden y `filterable`:
 *  - `ptgVersion` va antes que `ptgNumber` para que "versión ptg" se consuma antes y
 *    no lo capture el alias suelto "ptg".
 *  - Los campos RTF (`definition`, `impliesProvisional`) no son filtrables (LIKE sobre
 *    marcado RTF es poco fiable); al devolverlos, el handler les quita el RTF.
 *  - `sheetColor` (número RGB) no se filtra por no ser un dato que el usuario consulte.
 */

import { FieldSpec } from '../helpers/FieldQuery';

export const ACTIVIDAD_FIELDS: FieldSpec[] = [
  { key: 'code',               column: 'Actividad_Codigo',            label: 'código',              aliases: ['código', 'codigo', 'cod'],                                       filterable: true,  type: 'string' },
  { key: 'description',        column: 'Actividad_Descripcion',       label: 'descripción',         aliases: ['descripción', 'descripcion', 'desc'],                            filterable: true,  type: 'string' },
  { key: 'observations',       column: 'Actividad_Observaciones',     label: 'observaciones',       aliases: ['observaciones', 'observación', 'observacion', 'obs', 'notas'],    filterable: true,  type: 'string' },
  { key: 'represents',         column: 'Actividad_Representa',        label: 'representa',          aliases: ['representa', 'representación', 'representacion'],                  filterable: true,  type: 'number' },
  { key: 'implies',            column: 'Actividad_Implica',           label: 'implica',             aliases: ['implica', 'implicancia'],                                        filterable: true,  type: 'number' },
  { key: 'impliesProvisional', column: 'Actividad_ImplicaProvisorio', label: 'implica provisorio',  aliases: ['implica provisorio', 'implicaprovisorio', 'provisorio'],          filterable: false, type: 'string' },
  { key: 'definition',         column: 'Actividad_Definicion',        label: 'definición',          aliases: ['definición', 'definicion', 'def'],                               filterable: false, type: 'string' },
  { key: 'sheetColor',         column: 'Actividad_ColorHojaRGB',      label: 'color de hoja',       aliases: ['color de hoja', 'color hoja', 'color'],                          filterable: false, type: 'number' },
  { key: 'ptgVersion',         column: 'Actividad_PTGVersion',        label: 'versión PTG',         aliases: ['versión ptg', 'version ptg', 'ptg version', 'ptg versión'],       filterable: true,  type: 'number' },
  { key: 'ptgNumber',          column: 'Actividad_PTGNumero',         label: 'número PTG',          aliases: ['número ptg', 'numero ptg', 'nro ptg', 'ptg numero', 'ptg'],       filterable: true,  type: 'number' },
];

/**
 * Proyección por defecto cuando el usuario NO nombra campos: código + descripción
 * (lo más legible; evita volcar los campos RTF/color por defecto). Si el usuario pide
 * "todos los campos" recibe el catálogo completo (lo resuelve `extractRequestedFields`).
 */
export const ACTIVIDAD_DEFAULT_FIELDS: FieldSpec[] = ACTIVIDAD_FIELDS.filter(f =>
  ['code', 'description'].includes(f.key)
);
