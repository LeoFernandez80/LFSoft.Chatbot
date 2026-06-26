import { ProcessedMessage, ActionResult } from '../../../models/types';
import { ActionHandler } from './ActionHandlers';

/**
* Handler: Despedida
*/

export class FarewellHandler implements ActionHandler {
    async handle(context: ProcessedMessage): Promise<ActionResult> {
        return {
            success: true,
            data: {
                message: '¡Hasta luego! Que tengas un excelente día.'
            }
        };
    }
}
