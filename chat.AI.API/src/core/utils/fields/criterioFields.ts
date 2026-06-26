/**
 * Catálogo de campos de la entidad Criterios (tabla `Criterios` de `Criterios.mdb`).
 *
 * Declara TODOS los campos del esquema real: clave en inglés (slot), columna real,
 * etiqueta en español (CSV/mensaje), sinónimos en español, si es filtrable y su tipo.
 * Habilita la proyección (qué devolver) y los filtros (por qué filtrar).
 *
 * Orden: `subgroup` va antes que `group` para que "subgrupo" se consuma antes y no
 * lo capture el alias "grupo".
 */

import { FieldSpec } from '../helpers/FieldQuery';

export const CRITERIO_FIELDS: FieldSpec[] = [
  { key: 'listPrice',    column: 'Criterio_ListaPrecios_Codigo', label: 'lista de precios', aliases: ['lista de precios', 'lista precios', 'listaprecios', 'lp'], filterable: true,  type: 'number' },
  { key: 'family',       column: 'Criterio_Familia_Codigo',      label: 'familia',          aliases: ['familia', 'familias'],                                    filterable: true,  type: 'number' },
  { key: 'subgroup',     column: 'Criterio_SubGrupo_Codigo',     label: 'subgrupo',         aliases: ['subgrupo', 'sub grupo', 'subgrupos'],                     filterable: true,  type: 'number' },
  { key: 'group',        column: 'Criterio_Grupo_Codigo',        label: 'grupo',            aliases: ['grupo', 'grupos'],                                        filterable: true,  type: 'number' },
  { key: 'subgroupName', column: 'Criterio_SubGrupo_Nombre',     label: 'nombre subgrupo',  aliases: ['nombre del subgrupo', 'nombre subgrupo', 'nombre'],       filterable: true,  type: 'string' },
  { key: 'discount',     column: 'Criterio_Descuento',           label: 'descuento',        aliases: ['descuento', 'descuentos'],                                filterable: true,  type: 'number' },
  { key: 'currency',     column: 'Criterio_Moneda',              label: 'moneda',           aliases: ['moneda'],                                                 filterable: true,  type: 'number' },
  { key: 'description',  column: 'Criterio_Descripcion',         label: 'descripción',      aliases: ['descripción', 'descripcion', 'desc'],                     filterable: true,  type: 'string' },
  // `Criterio_Activo` es booleano: se puede pedir para devolver, pero no se filtra por él
  // (evita LIKE/comparaciones ambiguas sobre booleano en Access).
  { key: 'active',       column: 'Criterio_Activo',              label: 'activo',           aliases: ['activo'],                                                 filterable: false, type: 'string' },
];
