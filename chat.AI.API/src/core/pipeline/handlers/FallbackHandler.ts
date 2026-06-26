import { ProcessedMessage, ActionResult } from '../../../models/types';
import { ActionHandler } from './ActionHandlers';

/**
* Handler: Fallback (desconocido)
*/

export class FallbackHandler implements ActionHandler {
    async handle(context: ProcessedMessage): Promise<ActionResult> {
        return {
            success: true,
            data: {
                message: 'No estoy seguro de entender. ¿Podrías reformular tu pregunta?'
            }
        };
    }
}
