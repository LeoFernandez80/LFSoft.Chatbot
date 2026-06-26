/**
* Engine Client - Facade para los servicios LLM y NLP (in-process)
*/

import { llmService } from '../../engine/services/LLMService';
import { nlpService } from '../../engine/services/NLPService';

export class EngineClient {
// ==================== LLM METHODS ====================

async generate(request: {
prompt: string;
systemPrompt?: string;
temperature?: number;
maxTokens?: number;
model?: string;
messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
}): Promise<any> {
return llmService.generate(request);
}

async classifyIntent(request: {
text: string;
intents: string[];
}): Promise<any> {
return llmService.classifyIntent(request);
}

// ==================== NLP METHODS ====================

async extractEntities(text: string): Promise<any> {
return nlpService.extractEntities({ text });
}

async detectLanguage(text: string): Promise<any> {
return nlpService.detectLanguage({ text });
}

async correctSpelling(text: string): Promise<any> {
return nlpService.correctSpelling({ text });
}

async analyzeSentiment(text: string): Promise<any> {
return nlpService.analyzeSentiment({ text });
}

async extractKeywords(text: string, maxKeywords?: number): Promise<any> {
return nlpService.extractKeywords({ text, maxKeywords });
}

async healthCheck(): Promise<boolean> {
return true;
}
}

export const engineClient = new EngineClient();