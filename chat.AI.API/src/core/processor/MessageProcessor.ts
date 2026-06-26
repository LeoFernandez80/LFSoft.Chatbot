/**
* Message Processor - Fachada principal
* Punto de entrada para procesamiento de mensajes
*/

import { v4 as uuidv4 } from 'uuid';
import { IncomingMessage, FinalResponse } from '../../models/types';
import { messageQueue, Priority } from './MessageQueue';
import { messagePipeline } from '../pipeline/MessagePipeline';
import { ConnectorFactory } from '../../connectors';

export class MessageProcessor {
/**
* Validar mensaje entrante
*/
private async validate(request: any): Promise<void> {
const errors: any[] = [];

if (!request.sessionId) {
errors.push({ field: 'sessionId', message: 'Required' });
}

if (!request.message?.content) {
errors.push({ field: 'message.content', message: 'Required' });
}

if (request.message?.content && request.message.content.length > 2000) {
errors.push({ field: 'message.content', message: 'Max 2000 characters' });
}

if (request.message?.content && request.message.content.trim().length === 0) {
errors.push({ field: 'message.content', message: 'Cannot be empty' });
}

// Rate limit
const rateLimitOk = await this.checkRateLimit(request.userId, request.tenantId);
if (!rateLimitOk) {
errors.push({ field: 'userId', message: 'Rate limit exceeded' });
}

if (errors.length > 0) {
throw new Error(`Validation failed: ${JSON.stringify(errors)}`);
}
}

private async checkRateLimit(userId: string, tenantId: string): Promise<boolean> {
const cache = await ConnectorFactory.getCache();
const key = `rate_limit:${tenantId}:${userId}`;
const limit = 60;
const window = 60;

const current = await cache.incr(key);

if (current === 1) {
await cache.expire(key, window);
}
return current <= limit;
}

/**
* Sanitizar mensaje
*/
private sanitize(message: any): any {
let content = message.content;

// Remover HTML
content = content.replace(/<[^>]*>/g, '');

// Normalizar espacios
content = content.replace(/\s+/g, ' ').trim();

// Remover caracteres de control
content = content.replace(/[\x00-\x1F\x7F-\x9F]/g, '');

return {
...message,
content,
originalContent: message.content,
sanitized: true
};
}

/**
* Procesar mensaje de forma asíncrona (usando cola)
*/
async processAsync(
  request: any,
  priority: Priority = 'normal'
): Promise<{ messageId: string; status: string }> {
  console.log('[MessageProcessor] processAsync()');
  // Validar
  await this.validate(request);

  // Sanitizar
  request.message = this.sanitize(request.message);

// Crear incoming message
const incomingMessage: IncomingMessage = {
sessionId: request.sessionId,
userId: request.userId,
tenantId: request.tenantId,
message: request.message,
metadata: {
timestamp: new Date(),
channel: request.metadata?.channel || 'api',
...request.metadata
}
};

// Encolar
const messageId = await messageQueue.enqueue(incomingMessage, priority);

return {
messageId,
status: 'queued'
};
}

/**
* Procesar mensaje de forma síncrona (directo, sin cola)
*/
async processSync(request: any): Promise<FinalResponse> {
console.log('[MessageProcessor] processSync()');
// Validar
await this.validate(request);

// Sanitizar
request.message = this.sanitize(request.message);

// Crear incoming message
const incomingMessage: IncomingMessage = {
sessionId: request.sessionId,
userId: request.userId,
tenantId: request.tenantId,
message: request.message,
metadata: {
timestamp: new Date(),
channel: request.metadata?.channel || 'api',
...request.metadata
}
};

// Procesar directamente por el pipeline
const result = await messagePipeline.process(incomingMessage);

if (!result.finalResponse) {
throw new Error('No response generated');
}

return result.finalResponse;
}

/**
* Obtener estado de procesamiento
*/
async getProcessingStats(): Promise<any> {
console.log('[MessageProcessor] getProcessingStats()');
return await messageQueue.getStats();
}
}

export const messageProcessor = new MessageProcessor();