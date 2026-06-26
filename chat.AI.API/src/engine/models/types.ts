/**
* Tipos para el Motor de IA/NLP
*/

// ==================== LLM MODELS ====================

export interface LLMGenerateRequest {
prompt: string;
systemPrompt?: string;
temperature?: number;
maxTokens?: number;
model?: string;
/** Conversation history to pass as proper OpenAI messages (role + content) */
messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface LLMGenerateResponse {
content: string;
model: string;
usage: {
promptTokens: number;
completionTokens: number;
totalTokens: number;
};
processingTime: number;
}

export interface LLMClassifyIntentRequest {
text: string;
intents: string[];
}

export interface LLMClassifyIntentResponse {
intent: string;
confidence: number;
reasoning: string;
processingTime: number;
}

// ==================== NLP MODELS ====================

export interface Entity {
text: string;
type: string;
startPos: number;
endPos: number;
confidence: number;
}

export interface NLPExtractEntitiesRequest {
text: string;
}

export interface NLPExtractEntitiesResponse {
text: string;
entities: Entity[];
processingTime: number;
}

export interface NLPDetectLanguageRequest {
text: string;
}

export interface NLPDetectLanguageResponse {
language: string;
confidence: number;
processingTime: number;
}

export interface NLPCorrectSpellingRequest {
text: string;
}

export interface NLPCorrectSpellingResponse {
correctedText: string;
corrections: Array<{ original: string; corrected: string }>;
processingTime: number;
}

export interface SentimentResult {
sentiment: 'positive' | 'negative' | 'neutral';
score: number;
confidence: number;
}

export interface NLPAnalyzeSentimentRequest {
text: string;
}

export interface NLPAnalyzeSentimentResponse {
result: SentimentResult;
processingTime: number;
}

export interface NLPExtractKeywordsRequest {
text: string;
maxKeywords?: number;
}

export interface NLPExtractKeywordsResponse {
keywords: Array<{ keyword: string; frequency: number }>;
processingTime: number;
}

// ==================== ERROR MODELS ====================

export interface ErrorResponse {
error: string;
message: string;
statusCode: number;
}