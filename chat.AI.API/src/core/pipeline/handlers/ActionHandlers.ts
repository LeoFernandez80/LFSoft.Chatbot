/**
* Action Handlers - Manejadores de acciones por intención
*/

import { ProcessedMessage, ActionResult } from '../../../models/types';

/**
* Handler Base Interface
*/
export interface ActionHandler {
    handle(context: ProcessedMessage): Promise<ActionResult>;
}

export { GreetingHandler } from './GreetingHandler';
export { FarewellHandler } from './FarewellHandler';
export { FallbackHandler } from './FallbackHandler';
export { SupportHandler } from './SupportHandler';
export { OrderTrackingHandler } from './OrderTrackingHandler';
export { SearchPurchaseHandler as PurchaseHandler } from './searches/SearchPurchaseHandler';
export { SearchArticuleStockHandler as StockQueryHandler } from './searches/SearchArticuleStockHandler';
export { PriceQueryHandler } from './PriceQueryHandler';
export { SearchParitiesHandler } from './searches/SearchParitiesHandler';
export { SearchEmployeesHandler } from './searches/SearchEmployeesHandler';
export { SearchActivitiesHandler } from './searches/SearchActivitiesHandler';
export { SearchTextsHandler } from './searches/SearchTextsHandler';
export { SearchCriteriaHandler } from './searches/SearchCriteriaHandler';



