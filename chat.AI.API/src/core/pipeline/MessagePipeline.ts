/**
* Message Processing Pipeline
* Orquesta todas las etapas de procesamiento
*/

import { v4 as uuidv4 } from 'uuid';
import { ProcessedMessage, IncomingMessage } from '../../models/types';
import { PreprocessorStage } from './stages/PreprocessorStage';
import { ContextLoaderStage } from './stages/ContextLoaderStage';
import { IntentClassifierStage } from './stages/IntentClassifierStage';
import { ActionRouterStage } from './stages/ActionRouterStage';
import { ResponseGeneratorStage } from './stages/ResponseGeneratorStage';
import { PostprocessorStage } from './stages/PostprocessorStage';

export class MessagePipeline {
private stages = [
new PreprocessorStage(),
new ContextLoaderStage(),
new IntentClassifierStage(),
new ActionRouterStage(),
new ResponseGeneratorStage(),
new PostprocessorStage()
];

async process(message: IncomingMessage): Promise<ProcessedMessage> {
const startTime = Date.now();

// Inicializar contexto
let context: ProcessedMessage = {
id: uuidv4(),
originalMessage: message,
currentMessage: {
content: message.message.content
},
session: null as any,
tenantConfig: null as any,
metadata: {}
};

console.log(`\n🚀 Processing message for session ${message.sessionId}`);

// Ejecutar cada etapa secuencialmente
for (const stage of this.stages) {
try {
const stageStart = Date.now();

console.log(` ⚙ Executing stage: ${stage.name}`);

context = await stage.execute(context);

const stageDuration = Date.now() - stageStart;
context.metadata[`${stage.name}_duration_ms`] = stageDuration;

console.log(` ✅ Stage ${stage.name} completed in ${stageDuration}ms`);

// Early exit si alguna etapa lo indica
if (context.shouldExit) {
console.log(` ⏹ Early exit at stage: ${stage.name}`);
break;
}

} catch (error) {
console.error(` ❌ Stage ${stage.name} failed:`, error);

// Decidir si continuar o abortar
if (stage.critical) {
throw error;
} else {
context.metadata[`${stage.name}_error`] = (error as Error).message;
// Continuar con siguiente etapa
}
}
}

const totalDuration = Date.now() - startTime;
context.metadata.total_duration_ms = totalDuration;
context.metadata.processingTime = totalDuration;

console.log(`✨ Message processed successfully in ${totalDuration}ms\n`);

return context;
}
}

export const messagePipeline = new MessagePipeline();