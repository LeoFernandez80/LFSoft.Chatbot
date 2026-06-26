/**
* NLP Service - Servicio de procesamiento de lenguaje natural
*/

import {
Entity,
NLPExtractEntitiesRequest,
NLPExtractEntitiesResponse,
NLPDetectLanguageRequest,
NLPDetectLanguageResponse,
NLPCorrectSpellingRequest,
NLPCorrectSpellingResponse,
NLPAnalyzeSentimentRequest,
NLPAnalyzeSentimentResponse,
NLPExtractKeywordsRequest,
NLPExtractKeywordsResponse,
SentimentResult
} from '../models/types';

export class NLPService {
private entityPatterns = {
PRODUCT: [
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
/western\s+digital(?:\s+\w+)?/gi
],
PRICE: [
  /\$\s*\d+(?:,\d{3})*(?:\.\d{2})?/g,
  /\d+\s*(?:pesos|dólares|USD|MXN)/gi
  ],
  DATE: [
    /\d{1,2}\/\d{1,2}\/\d{2,4}/g,
    /\d{4}-\d{2}-\d{2}/g,
    /(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+\d{1,2}/g
  ],
  PHONE: [
    /\d{3}[-.]?\d{3}[-.]?\d{4}/g,
    /\+?\d{1,3}\s?\d{3}\s?\d{3}\s?\d{4}/g
  ],
  EMAIL: [
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
  ],
  ORDER_NUMBER: [
/\b[A-Z0-9]{8,}\b/g,
/\b#?\d{6,}\b/g
],
QUANTITY: [
/\b(\d+)\s*(?:unidades?|piezas?|items?)/gi
]
};

private sentimentWords = {
positive: [
'excelente', 'bueno', 'genial', 'perfecto', 'increíble', 'fantástico',
'maravilloso', 'gracias', 'contento', 'feliz', 'satisfecho', 'encantado',
'me gusta', 'amor', 'bien', 'mejor', 'recomiendo'
],
negative: [
'malo', 'terrible', 'horrible', 'pésimo', 'peor', 'deficiente',
'problema', 'error', 'falla', 'no funciona', 'roto', 'insatisfecho',
'queja', 'disgustado', 'molesto', 'enojado', 'frustrante', 'decepcionante'
]
};

async extractEntities(request: NLPExtractEntitiesRequest): Promise<NLPExtractEntitiesResponse> {
console.log('[NLPService] extractEntities()');
const startTime = Date.now();
await this.delay(20, 50);

const { text } = request;
const entities: Entity[] = [];

for (const [type, patterns] of Object.entries(this.entityPatterns)) {
for (const pattern of patterns) {
const matches = Array.from(text.matchAll(pattern));
matches.forEach(match => {
console.log('[NLPService] extractEntities() - Match:', match);
if (match.index !== undefined) {
entities.push({
text: match[0].trim(),
type,
startPos: match.index,
endPos: match.index + match[0].length,
confidence: this.calculateEntityConfidence(type, match[0])
});
}
});
}
}

const uniqueEntities = this.deduplicateEntities(entities);
console.log('[NLPService] extractEntities() - Completed with entities:', uniqueEntities);
return {
text,
entities: uniqueEntities,
processingTime: Date.now() - startTime
};
}

async detectLanguage(request: NLPDetectLanguageRequest): Promise<NLPDetectLanguageResponse> {
console.log('[NLPService] detectLanguage()');
const startTime = Date.now();
await this.delay(10, 30);

const { text } = request;
const lowerText = text.toLowerCase();

const spanishWords = [
'cuánto', 'precio', 'cuesta', 'hola', 'gracias', 'por favor', 'necesito',
'quiero', 'tengo', 'está', 'para', 'con', 'una', 'las', 'los'
];

const englishWords = [
'how', 'much', 'price', 'hello', 'thank', 'please', 'need',
'want', 'have', 'the', 'for', 'with', 'and', 'this', 'that'
];

let spanishScore = 0;
let englishScore = 0;

spanishWords.forEach(word => {
if (lowerText.includes(word)) spanishScore++;
});

englishWords.forEach(word => {
if (lowerText.includes(word)) englishScore++;
});

let language = 'es';
let confidence = 0.5;

if (spanishScore > englishScore) {
language = 'es';
confidence = Math.min(0.6 + (spanishScore * 0.1), 0.95);
} else if (englishScore > spanishScore) {
language = 'en';
confidence = Math.min(0.6 + (englishScore * 0.1), 0.95);
}

return {
language,
confidence,
processingTime: Date.now() - startTime
};
}
async correctSpelling(request: NLPCorrectSpellingRequest): Promise<NLPCorrectSpellingResponse> {
console.log('[NLPService] correctSpelling()');
const startTime = Date.now();
await this.delay(15, 35);

const { text } = request;
const corrections: Array<{ original: string; corrected: string }> = [];

const correctionMap: { [key: string]: string } = {
'cuanto': 'cuánto',
'q': 'que',
'xq': 'porque',
'bn': 'bien',
'pq': 'porque',
'tmb': 'también',
'tb': 'también',
'x': 'por',
'k': 'que',
'ola': 'hola',
'salu2': 'saludos',
'grax': 'gracias',
'thx': 'gracias'
};

let correctedText = text;

for (const [wrong, correct] of Object.entries(correctionMap)) {
const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
const matches = text.match(regex);

if (matches) {
corrections.push({ original: wrong, corrected: correct });
correctedText = correctedText.replace(regex, correct);
}
}

return {
correctedText,
corrections,
processingTime: Date.now() - startTime
};
}

async analyzeSentiment(request: NLPAnalyzeSentimentRequest): Promise<NLPAnalyzeSentimentResponse> {
console.log('[NLPService] analyzeSentiment()');
const startTime = Date.now();
await this.delay(20, 40);

const { text } = request;
const lowerText = text.toLowerCase();

let positiveScore = 0;
let negativeScore = 0;

this.sentimentWords.positive.forEach(word => {
const count = (lowerText.match(new RegExp(word, 'g')) || []).length;
positiveScore += count;
});
this.sentimentWords.negative.forEach(word => {
const count = (lowerText.match(new RegExp(word, 'g')) || []).length;
negativeScore += count;
});

const totalWords = positiveScore + negativeScore;

let result: SentimentResult;

if (totalWords === 0) {
result = {
sentiment: 'neutral',
score: 0,
confidence: 0.5
};
} else {
const score = (positiveScore - negativeScore) / (totalWords + 1);
const sentiment = score > 0.2 ? 'positive' : score < -0.2 ? 'negative' : 'neutral';
const confidence = Math.min(0.6 + (Math.abs(score) * 0.4), 0.95);

result = {
sentiment,
score,
confidence
};
}

return {
result,
processingTime: Date.now() - startTime
};
}

async extractKeywords(request: NLPExtractKeywordsRequest): Promise<NLPExtractKeywordsResponse> {
console.log('[NLPService] extractKeywords()');
const startTime = Date.now();
await this.delay(25, 50);

const { text, maxKeywords = 5 } = request;

const stopWords = new Set([
'el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'en', 'por',
'para', 'con', 'sin', 'sobre', 'entre', 'y', 'o', 'pero', 'si',
'no', 'es', 'son', 'que', 'a', 'al'
]);

const tokens = text
.toLowerCase()
.replace(/[^\w\sáéíóúñü]/g, ' ')
.split(/\s+/)
.filter(token => token.length > 0);

const wordFreq: { [key: string]: number } = {};

tokens.forEach(token => {
if (!stopWords.has(token) && token.length > 2) {
wordFreq[token] = (wordFreq[token] || 0) + 1;
}
});
  const keywords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word, frequency]) => ({ keyword: word, frequency }));

  return {
    keywords,
    processingTime: Date.now() - startTime
  };
}

private calculateEntityConfidence(type: string, text: string): number {
let confidence = 0.7;

switch (type) {
case 'PRODUCT':
if (/dell|hp|lenovo|samsung|iphone|apple/i.test(text)) {
confidence = 0.9;
}
break;

case 'PRICE':
if (/\$\s*\d+\.\d{2}/.test(text)) {
confidence = 0.95;
}
break;

case 'EMAIL':
confidence = 0.95;
break;

case 'PHONE':
confidence = 0.85;
break;
}

return confidence;
}

private deduplicateEntities(entities: Entity[]): Entity[] {
const seen = new Set<string>();
const unique: Entity[] = [];

entities
.sort((a, b) => b.confidence - a.confidence)
.forEach(entity => {
const key = `${entity.type}:${entity.text.toLowerCase()}`;
if (!seen.has(key)) {
seen.add(key);
unique.push(entity);
}
});

return unique;
}

private delay(min: number, max: number): Promise<void> {
const ms = Math.random() * (max - min) + min;
return new Promise(resolve => setTimeout(resolve, ms));
}
}

export const nlpService = new NLPService();