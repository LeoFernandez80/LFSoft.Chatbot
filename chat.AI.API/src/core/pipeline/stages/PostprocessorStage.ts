/**
* Stage 6: Postprocessor
* Formateo final, guardado de mensajes, analytics
*/

import { PipelineStage } from './PreprocessorStage';
import { ProcessedMessage, Message } from '../../../models/types';
import { sessionManager } from '../../session/SessionManager';
import { ConnectorFactory } from '../../../connectors';
import { v4 as uuidv4 } from 'uuid';

export class PostprocessorStage implements PipelineStage {
name = 'postprocessor';
critical = false;

async execute(context: ProcessedMessage): Promise<ProcessedMessage> {
const { response, session } = context;
const db = await ConnectorFactory.getDatabase();

if (!response) throw new Error('No response generated');

const formattedResponse = this.formatResponse(response);

const assistantMessage: Message = {
id: uuidv4(),
role: 'assistant',
content: formattedResponse.content,
timestamp: new Date(),
intent: context.intent?.name,
confidence: context.intent?.confidence,
metadata: { method: context.metadata.classificationMethod }
};

session.messages.push(assistantMessage);

await sessionManager.updateSession(session.sessionId, {
messages: session.messages,
context: session.context,
lastActivityAt: new Date()
});

await db.collection('session_messages').insert({
session_id: session.sessionId,
...assistantMessage
});

await db.collection('analytics_events').insert({
event: 'message_processed',
sessionId: session.sessionId,
userId: session.userId,
tenantId: session.tenantId,
intent: context.intent?.name,
confidence: context.intent?.confidence,
processingTime: context.metadata.total_duration_ms,
success: context.actionResult?.success,
timestamp: new Date()
});

console.log(`📊 Event tracked: message_processed - ${context.intent?.name}`);

context.finalResponse = {
sessionId: session.sessionId,
message: formattedResponse,
metadata: {
processingTime: context.metadata.processingTime,
intent: context.intent?.name
}
};

return context;
}

private formatResponse(response: any): any {
return {
id: uuidv4(),
type: response.type || 'text',
content: response.content,
quickReplies: response.quickReplies || [],
attachments: response.attachments || [],
timestamp: new Date()
};
}
}