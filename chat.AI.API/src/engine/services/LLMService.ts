/**
* LLM Service - Servicio de generación de lenguaje
* Soporta Azure OpenAI y OpenAI regular (misma configuración que Mandi.AI 1.0).
* Si no hay API key configurada, opera en modo simulado como fallback.
*/

import OpenAI from 'openai';
import {
LLMGenerateRequest,
LLMGenerateResponse,
LLMClassifyIntentRequest,
LLMClassifyIntentResponse
} from '../models/types';

const DEFAULT_SYSTEM_PROMPT = `Eres Mandi, una asistente de inteligencia artificial amigable y útil.
Respondes siempre en el mismo idioma en que el usuario te habla.
Eres concisa, precisa y natural en tus respuestas.`;

export class LLMService {
private client: OpenAI | null = null;
private model: string = 'gpt-4';

// Simulation fallback templates
private responseTemplates = {
saludo: [
'¡Hola! ¿En qué puedo ayudarte hoy?',
'Bienvenido, estoy aquí para asistirte.',
'¡Hola! Es un placer poder ayudarte.'
],
despedida: [
'¡Hasta luego! Que tengas un excelente día.',
'Fue un placer ayudarte. ¡Hasta pronto!',
'Adiós, espero haberte sido de ayuda.'
],
precio: [
'El precio de {producto} es ${precio}. {stock_info}',
'Actualmente {producto} tiene un precio de ${precio}. {stock_info}',
'{producto} está disponible por ${precio}. {stock_info}'
],
stock: [
'Tenemos {cantidad} unidades de {producto} en stock.',
'Hay {cantidad} unidades disponibles de {producto}.',
'El stock actual de {producto} es de {cantidad} unidades.'
],
default: [
'Entiendo tu consulta. Déjame ayudarte con eso.',
'Claro, puedo asistirte con esa información.',
'Por supuesto, permíteme ayudarte.'
]
};

constructor() {
this.initializeClient();
}

// ─── Initialization ────────────────────────────────────────────────────────
private initializeClient(): void {
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
console.log('[LLMService] No OPENAI_API_KEY found — running in simulation mode');
return;
}

const baseUrl = process.env.OPENAI_BASE_URL;
const deployment = process.env.OPENAI_DEPLOYMENT;
const apiVersion = process.env.OPENAI_API_VERSION;
const isAzure = !!(baseUrl && deployment && apiVersion);

if (isAzure) {
const normalizedBase = baseUrl!.replace(/\/$/, '');
console.log(`[LLMService] Azure OpenAI — endpoint: ${normalizedBase}, deployment: ${deployment}`);
this.model = deployment!;
this.client = new OpenAI({
apiKey,
baseURL: `${normalizedBase}/openai/deployments/${deployment}`,
defaultQuery: { 'api-version': apiVersion },
defaultHeaders: { 'api-key': apiKey }
});
} else {
this.model = process.env.OPENAI_MODEL || 'gpt-4';
console.log(`[LLMService] OpenAI — model: ${this.model}`);
this.client = new OpenAI({ apiKey });
}
}

// ─── Public API ────────────────────────────────────────────────────────────

async generate(request: LLMGenerateRequest): Promise<LLMGenerateResponse> {
console.log('[LLMService] generate()');
const startTime = Date.now();

if (!this.client) {
return this.simulateGenerate(request, startTime);
}

const {
prompt,
systemPrompt,
temperature = 0.7,
maxTokens = 500,
messages = [],
model
} = request;

  // Build messages array: system → history → current user turn
  const openAIMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt || DEFAULT_SYSTEM_PROMPT },
    ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content: prompt }
  ];

  console.log(`[LLMService] Calling OpenAI: ${openAIMessages.length} messages, model: ${model || this.model}`);

  const response = await this.client.chat.completions.create({
    model: model || this.model,
    messages: openAIMessages,
    temperature,
    max_tokens: maxTokens
  });

  const content = response.choices[0].message.content ?? '';
  const usage = response.usage;

  console.log(`[LLMService] OpenAI usage — prompt: ${usage?.prompt_tokens}, completion: ${usage?.completion_tokens}`);

  return {
    content,
    model: response.model,
    usage: {
      promptTokens: usage?.prompt_tokens ?? 0,
completionTokens: usage?.completion_tokens ?? 0,
totalTokens: usage?.total_tokens ?? 0
},
processingTime: Date.now() - startTime
};
}

async classifyIntent(request: LLMClassifyIntentRequest): Promise<LLMClassifyIntentResponse> {
console.log('[LLMService] classifyIntent()');
const startTime = Date.now();

// Fast keyword-based classification (no API tokens needed)
const { text, intents } = request;
const lowerText = text.toLowerCase();

const intentKeywords: { [key: string]: string[] } = {
// saludo: ['hola', 'buenos días', 'buenas tardes', 'hey', 'hi'],
// despedida: ['adiós', 'hasta luego', 'chao', 'bye'],
// consulta_precio: ['precio', 'cuesta', 'cuánto', 'valor', 'vale'],
// consulta_stock: ['stock', 'disponible', 'hay', 'tienen'],
// realizar_compra: ['comprar', 'quiero', 'agregar', 'añadir', 'carrito'],
// queja: ['queja', 'malo', 'terrible', 'insatisfecho']
};

let bestIntent = 'otro';
let maxScore = 0;

for (const intent of intents) {
const keywords = intentKeywords[intent] || [];
const score = keywords.filter(k => lowerText.includes(k)).length;
if (score > maxScore) { maxScore = score; bestIntent = intent; }
}

const confidence = maxScore > 0 ? Math.min(0.6 + maxScore * 0.2, 0.95) : 0.4;

return {
intent: bestIntent,
confidence,
  reasoning: maxScore > 0
    ? `Detectadas ${maxScore} palabras clave relacionadas con ${bestIntent}`
    : 'No se detectaron palabras clave específicas',
  processingTime: Date.now() - startTime
};
}

// ─── Simulation fallback (no API key) ─────────────────────────────────────

private async simulateGenerate(request: LLMGenerateRequest, startTime: number): Promise<LLMGenerateResponse> {
  await this.delay(100, 300);
  const { prompt, temperature = 0.7, maxTokens = 500 } = request;

  let content = this.simulateResponse(prompt, temperature);
  content = this.truncateToTokens(content, maxTokens);

  return {
    content,
    model: 'simulated-gpt-4',
    usage: {
      promptTokens: Math.ceil(prompt.length / 4),
      completionTokens: Math.ceil(content.length / 4),
      totalTokens: Math.ceil((prompt.length + content.length) / 4)
    },
    processingTime: Date.now() - startTime
  };
}

private simulateResponse(prompt: string, temperature: number): string {
  const lowerPrompt = prompt.toLowerCase();

  if (this.containsWords(lowerPrompt, ['hola', 'buenos días', 'buenas tardes'])) {
    return this.randomChoice(this.responseTemplates.saludo, temperature);
  }
  if (this.containsWords(lowerPrompt, ['adiós', 'hasta luego', 'chao'])) {
    return this.randomChoice(this.responseTemplates.despedida, temperature);
  }
  if (this.containsWords(lowerPrompt, ['precio', 'cuesta', 'cuánto vale'])) {
    const entities = this.extractSimpleEntities(prompt);
    const producto = entities.products[0] || 'el producto';
    return this.randomChoice(this.responseTemplates.precio, temperature)
      .replace(/\{producto\}/gi, producto)
.replace(/\$\{precio\}/gi, 'consultar con un agente')
.replace(/\{stock_info\}/gi, 'Consultá disponibilidad con nuestro equipo.');
}
if (this.containsWords(lowerPrompt, ['stock', 'disponible', 'hay'])) {
const entities = this.extractSimpleEntities(prompt);
const producto = entities.products[0] || 'el producto';
return this.randomChoice(this.responseTemplates.stock, temperature)
.replace(/\{producto\}/gi, producto)
  .replace(/\{cantidad\}/gi, 'varias');
  }

  const entities = this.extractSimpleEntities(prompt);
  if (entities.products.length > 0) {
    return `Entiendo que estás interesado en ${entities.products[0]}. Déjame buscar esa información para ti.`;
  }

  return this.randomChoice(this.responseTemplates.default, temperature);
}

// ─── Helpers ───────────────────────────────────────────────────────────────

private extractSimpleEntities(text: string): { products: string[]; numbers: number[] } {
const productPatterns = [
// Tipos de producto
/laptop(?:\s+\w+)?/gi, /celular(?:\s+\w+)?/gi, /tablet(?:\s+\w+)?/gi,
/smartphone(?:\s+\w+)?/gi, /monitor(?:\s+\w+)?/gi, /drone(?:\s+\w+)?/gi,
/teclado(?:\s+\w+)?/gi, /mouse(?:\s+\w+)?/gi, /auriculares(?:\s+\w+)?/gi,
/smartwatch(?:\s+\w+)?/gi, /cámara(?:\s+\w+)?/gi, /router(?:\s+\w+)?/gi,
/consola(?:\s+\w+)?/gi, /altavoz(?:\s+\w+)?/gi, /micrófono(?:\s+\w+)?/gi,
/procesador(?:\s+\w+)?/gi, /gabinete(?:\s+\w+)?/gi, /aspiradora(?:\s+\w+)?/gi,
/cafetera(?:\s+\w+)?/gi, /impresora(?:\s+\w+)?/gi, /proyector(?:\s+\w+)?/gi,
/servidor(?:\s+\w+)?/gi, /workstation(?:\s+\w+)?/gi, /all-in-one(?:\s+\w+)?/gi,
/pulsera(?:\s+\w+)?/gi, /timbre(?:\s+\w+)?/gi, /batería(?:\s+\w+)?/gi,
/controlador(?:\s+\w+)?/gi, /nas(?:\s+\w+)?/gi, /ssd(?:\s+\w+)?/gi,
/ram(?:\s+\w+)?/gi, /e-reader(?:\s+\w+)?/gi, /visor(?:\s+\w+)?/gi,
/fuente(?:\s+\w+)?/gi, /iluminaci[oó]n(?:\s+\w+)?/gi, /smart\s*tv(?:\s+\w+)?/gi,
/tarjeta\s+gr[aá]fica(?:\s+\w+)?/gi, /tableta\s+gr[aá]fica(?:\s+\w+)?/gi,
/robot\s+aspiradora(?:\s+\w+)?/gi,
// Marcas
/dell(?:\s+\w+)?/gi, /apple(?:\s+\w+)?/gi, /samsung(?:\s+\w+)?/gi,
/lenovo(?:\s+\w+)?/gi, /hp(?:\s+\w+)?/gi, /asus(?:\s+\w+)?/gi,
/sony(?:\s+\w+)?/gi, /microsoft(?:\s+\w+)?/gi, /nintendo(?:\s+\w+)?/gi,
/gopro(?:\s+\w+)?/gi, /canon(?:\s+\w+)?/gi, /bose(?:\s+\w+)?/gi,
/razer(?:\s+\w+)?/gi, /logitech(?:\s+\w+)?/gi, /corsair(?:\s+\w+)?/gi,
/lg(?:\s+\w+)?/gi, /benq(?:\s+\w+)?/gi, /dji(?:\s+\w+)?/gi,
/amazon(?:\s+\w+)?/gi, /anker(?:\s+\w+)?/gi, /google(?:\s+\w+)?/gi,
/oneplus(?:\s+\w+)?/gi, /jabra(?:\s+\w+)?/gi, /elgato(?:\s+\w+)?/gi,
/wacom(?:\s+\w+)?/gi, /synology(?:\s+\w+)?/gi, /nvidia(?:\s+\w+)?/gi,
/amd(?:\s+\w+)?/gi, /nzxt(?:\s+\w+)?/gi, /thermaltake(?:\s+\w+)?/gi,
/fitbit(?:\s+\w+)?/gi, /garmin(?:\s+\w+)?/gi, /philips(?:\s+\w+)?/gi,
/ring(?:\s+\w+)?/gi, /irobot(?:\s+\w+)?/gi, /dyson(?:\s+\w+)?/gi,
/nespresso(?:\s+\w+)?/gi, /meta(?:\s+\w+)?/gi, /tp-link(?:\s+\w+)?/gi,
/ubiquiti(?:\s+\w+)?/gi,
// Modelos / nombres propios
/iphone(?:\s+\w+)?/gi, /ipad(?:\s+\w+)?/gi, /macbook(?:\s+\w+)?/gi,
/playstation(?:\s+\w+)?/gi, /xbox(?:\s+\w+)?/gi, /oculus(?:\s+\w+)?/gi,
/kindle(?:\s+\w+)?/gi, /roomba(?:\s+\w+)?/gi, /pixel(?:\s+\w+)?/gi,
/western\s+digital(?:\s+\w+)?/gi,
];

const products: string[] = [];
productPatterns.forEach(p => { const m = text.match(p); if (m) products.push(...m); });

const numberMatches = text.match(/\b\d+\b/g);
const numbers = numberMatches ? numberMatches.map(Number) : [];

return { products, numbers };
}

private containsWords(text: string, words: string[]): boolean {
return words.some(w => text.includes(w));
}

private randomChoice(options: string[], temperature: number): string {
if (temperature < 0.3) return options[0];
if (temperature > 0.7) return options[Math.floor(Math.random() * options.length)];
return options[Math.floor(Math.random() * Math.min(options.length, 2))];
}

private truncateToTokens(text: string, maxTokens: number): string {
if (Math.ceil(text.length / 4) <= maxTokens) return text;
return text.substring(0, maxTokens * 4) + '...';
}
private delay(min: number, max: number): Promise<void> {
return new Promise(resolve => setTimeout(resolve, Math.random() * (max - min) + min));
}
}

export const llmService = new LLMService();