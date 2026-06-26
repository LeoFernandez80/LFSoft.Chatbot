import { ProcessedMessage, ActionResult } from '../../../models/types';
import { ActionHandler } from './ActionHandlers';

/**
* Handler: Soporte Técnico
*/

export class SupportHandler implements ActionHandler {
    async handle(context: ProcessedMessage): Promise<ActionResult> {
        return {
            success: true,
            data: {
                message: 'Entiendo que tienes un problema. ¿Podrías darme más detalles?'
            }
        };
    }
}
