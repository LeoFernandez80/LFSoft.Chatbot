import { ProcessedMessage, ActionResult } from '../../../models/types';
import { ActionHandler } from './ActionHandlers';

/**
* Handler: Saludo
*/

export class GreetingHandler implements ActionHandler {
    async handle(context: ProcessedMessage): Promise<ActionResult> {
        const userName = context.userProfile?.name || 'Cliente';

        return {
            success: true,
            data: {
                greeting: `¡Hola ${userName}!`,
                message: '¿En qué puedo ayudarte hoy?'
            }
        };
    }
}
