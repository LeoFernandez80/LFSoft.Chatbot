/**
 * Stage 4: Action Router
 * Enruta la intención al handler correspondiente
 */

import { PipelineStage } from './PreprocessorStage';
import { ProcessedMessage } from '../../../models/types';
import { ActionHandler, FallbackHandler, FarewellHandler, GreetingHandler, OrderTrackingHandler, PriceQueryHandler, PurchaseHandler, SearchActivitiesHandler, SearchCriteriaHandler, SearchEmployeesHandler, SearchParitiesHandler, SearchTextsHandler, StockQueryHandler, SupportHandler } from '../handlers/ActionHandlers';

export class ActionRouterStage implements PipelineStage {
  name = 'action_router';
  critical = true;

  private handlers: Map<string, ActionHandler> = new Map();

  constructor() {
    this.registerHandlers();
  }

  private registerHandlers(): void {
    this.handlers.set('saludo', new GreetingHandler());
    this.handlers.set('despedida', new FarewellHandler());
    this.handlers.set('consulta_precio', new PriceQueryHandler());
    this.handlers.set('consulta_stock', new StockQueryHandler());
    this.handlers.set('realizar_compra', new PurchaseHandler());
    this.handlers.set('rastrear_pedido', new OrderTrackingHandler());
    this.handlers.set('soporte_tecnico', new SupportHandler());
    this.handlers.set('search_parity', new SearchParitiesHandler());
    this.handlers.set('search_employees', new SearchEmployeesHandler());
    this.handlers.set('search_activities', new SearchActivitiesHandler());
    this.handlers.set('search_texts', new SearchTextsHandler());
    this.handlers.set('search_criteria', new SearchCriteriaHandler());
    this.handlers.set('unknown', new FallbackHandler());
    this.handlers.set('otro', new FallbackHandler());
  }

  async execute(context: ProcessedMessage): Promise<ProcessedMessage> {
    console.log("ActionRouterStage - Intent:", context.intent?.name);

    const intentName = context.intent?.name || 'unknown';
    const handler = this.handlers.get(intentName) || this.handlers.get('unknown')!;

    // Ejecutar handler
    const result = await handler.handle(context);

    context.actionResult = result;
    context.metadata.handler = handler.constructor.name;

    return context;
  }
}
