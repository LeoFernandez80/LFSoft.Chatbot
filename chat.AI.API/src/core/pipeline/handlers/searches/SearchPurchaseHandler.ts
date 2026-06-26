import { ProcessedMessage, ActionResult } from '../../../../models/types';
import { ActionHandler } from '../ActionHandlers';

/**
* Handler: Buscar Compra
*/

export class SearchPurchaseHandler implements ActionHandler {
    async handle(context: ProcessedMessage): Promise<ActionResult> {
        const { entities } = context;

        if (!entities?.producto) {
            return {
                success: false,
                needsMoreInfo: true,
                question: '¿Qué producto deseas comprar?'
            };
        }

        // Aquí iría la lógica de búsqueda de compra
        return {
            success: true,
            data: {
                message: `Perfecto, procesando tu compra de ${entities.cantidad || 1} ${entities.producto}.`,
                quantity: entities.cantidad || 1,
                nextStep: 'payment'
            }
        };
    }
}
