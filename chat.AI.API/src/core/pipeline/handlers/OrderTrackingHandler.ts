import { ProcessedMessage, ActionResult } from '../../../models/types';
import { ActionHandler } from './ActionHandlers';

/**
* Handler: Rastrear Pedido
*/

export class OrderTrackingHandler implements ActionHandler {
    async handle(context: ProcessedMessage): Promise<ActionResult> {
        const { entities } = context;

        if (!entities?.orderNumber) {
            return {
                success: false,
                needsMoreInfo: true,
                question: '¿Cuál es tu número de pedido?'
            };
        }

        // Simular consulta de pedido
        return {
            success: true,
            data: {
                orderNumber: entities.orderNumber,
                status: 'En camino',
                estimatedDelivery: '2-3 días hábiles'
            }
        };
    }
}
