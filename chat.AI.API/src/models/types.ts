/**
* Modelos y tipos del sistema
*/

// ==================== SESSION MODELS ====================

export type SessionState = 'CREATED' | 'ACTIVE' | 'IDLE' | 'PAUSED' | 'CLOSED' | 'ARCHIVED' | 'RECOVERED' | 'AWAITING_AGENT';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  intent?: string;
  entities?: { [key: string]: any };
confidence?: number;
metadata?: {
[key: string]: any;
};
}

export interface SessionContext {
currentIntent?: string;
lastIntent?: string;
entities: { [key: string]: any };
conversationState?: string;
step?: number;
userProfile?: UserProfile;
tenantConfig?: TenantConfig;
preferences?: any;
lastProduct?: string;
purchaseHistory?: any[];
cart?: any;
handoffToHuman?: boolean;
handoffReason?: string;
waitingForUserInput?: boolean;
[key: string]: any;
}

export interface Session {
sessionId: string;
conversationId?: string;
userId: string;
tenantId: string;

// Temporal
startedAt: Date;
lastActivityAt: Date;
endedAt?: Date;
expiresAt: Date;

// Estado
state: SessionState;
closeReason?: string;

// Contexto
context: SessionContext;
messages: Message[];

// Metadata
metadata: {
channel?: string;
device?: string;
language?: string;
timezone?: string;
userAgent?: string;
ipAddress?: string;
referrer?: string;
currentDevice?: string;
[key: string]: any;
};

// Control
isActive: boolean;
isBotTyping?: boolean;
upgraded?: boolean;
upgradedAt?: Date;
previousSessionId?: string;
recoveredAt?: Date;
}

// ==================== USER MODELS ====================

export interface UserProfile {
userId: string;
tenantId: string;
name?: string;
email?: string;
tier?: 'regular' | 'VIP' | 'premium';
previousPurchases?: number;
registeredAt?: Date;
metadata?: {
[key: string]: any;
};
}

export interface UserMemory {
userId: string;
tenantId: string;
key: string;
value: any;
updatedAt: Date;
}

// ==================== TENANT MODELS ====================

export interface TenantConfig {
tenantId: string;
name: string;
slug: string;
active: boolean;
subscriptionTier?: string;

// AI Configuration
aiConfig?: {
provider: 'openai' | 'anthropic' | 'azure';
model: string;
temperature?: number;
maxTokens?: number;
systemPrompt?: string;
};

// Data Sources
dataSources?: {
[key: string]: DataSourceConfig;
};

// Conversation Flows
conversationFlows?: ConversationFlow[];

// Business Rules
businessRules?: BusinessRule[];

// Templates
templates?: {
[intent: string]: string;
};

// Features
features?: {
enableVoice?: boolean;
enableFileUpload?: boolean;
enablePayment?: boolean;
maxMessageLength?: number;
allowedFileTypes?: string[];
};

// Intents
intents?: string[];

// Webhooks
webhooks?: {
[event: string]: string;
};

// Domain
domain?: string;
}

export interface DataSourceConfig {
type: 'mysql' | 'postgresql' | 'mongodb' | 'rest-api' | 'graphql';
name: string;
connectionString?: string;
baseUrl?: string;
authType?: 'none' | 'basic' | 'bearer' | 'api-key';
credentials?: any;
}

export interface ConversationFlow {
intent: string;
actions: FlowAction[];
conditions?: FlowCondition[];
}

export interface FlowAction {
type: 'query_data' | 'format_response' | 'call_api' | 'send_webhook';
source?: string;
queryTemplate?: string;
responseTemplate?: string;
[key: string]: any;
}

export interface FlowCondition {
field: string;
operator: 'eq' | 'ne' | 'gt' | 'lt' | 'contains';
value: any;
}

export interface BusinessRule {
name: string;
condition: string;
action: string;
value?: any;
priority?: number;
}

// ==================== MESSAGE PROCESSING MODELS ====================

export interface IncomingMessage {
sessionId: string;
userId: string;
tenantId: string;
message: {
content: string;
type: 'text' | 'voice' | 'file';
attachments?: any[];
};
metadata: {
timestamp: Date;
channel: string;
deviceId?: string;
[key: string]: any;
};
}

export interface ProcessedMessage {
id: string;
originalMessage: IncomingMessage;
currentMessage: {
content: string;
preprocessed?: boolean;
sanitized?: boolean;
originalContent?: string;
};
session: Session;
tenantConfig: TenantConfig;
userProfile?: UserProfile;
userMemory?: any;
intent?: IntentClassification;
entities?: { [key: string]: any };
actionResult?: ActionResult;
response?: GeneratedResponse;
finalResponse?: FinalResponse;
metadata: {
language?: string;
translated?: boolean;
classificationMethod?: 'rule_based' | 'ml_model' | 'llm';
handler?: string;
generationStrategy?: 'template' | 'llm' | 'hybrid';
processingTime?: number;
total_duration_ms?: number;
[key: string]: any;
};
shouldExit?: boolean;
}

export interface IntentClassification {
name: string;
confidence: number;
method?: 'rule' | 'ml' | 'llm';
reasoning?: string;
}

export interface ActionResult {
success: boolean;
data?: any;
needsMoreInfo?: boolean;
question?: string;
nextState?: string;
productNotFound?: boolean;
multipleResults?: boolean;
csvDownloadId?: string;
message?: string;
suggestions?: any[];
triggerWebhook?: boolean;
error?: string;
}

export interface GeneratedResponse {
content: string;
type: 'text' | 'card' | 'carousel';
quickReplies?: QuickReply[];
attachments?: any[];
tone?: string;
metadata?: {
model?: string;
tokens?: any;
strategy?: string;
};
}

export interface QuickReply {
label: string;
value: string;
icon?: string;
}

export interface FinalResponse {
sessionId: string;
message: {
id: string;
type: string;
content: string;
quickReplies: QuickReply[];
attachments: any[];
timestamp: Date;
};
metadata: {
processingTime?: number;
intent?: string;
};
}

// ==================== QUEUE MODELS ====================

export interface QueuedMessage {
id: string;
sessionId: string;
userId: string;
tenantId: string;
message: IncomingMessage;
priority: 'high' | 'normal' | 'low';
enqueuedAt: number;
retryCount?: number;
failedAt?: Date;
error?: string;
}

// ==================== ANALYTICS MODELS ====================

export interface AnalyticsEvent {
event: string;
sessionId: string;
userId: string;
tenantId: string;
intent?: string;
confidence?: number;
processingTime?: number;
success?: boolean;
timestamp: Date;
metadata?: {
[key: string]: any;
};
}

// ==================== PRODUCT MODELS (Example) ====================

export interface Product {
id: string;
name: string;
description?: string;
price: number;
currency: string;
stock: number;
category?: string;
brand?: string;
imageUrl?: string;
available: boolean;
}

// ==================== NLP MODEL TYPES ====================

export interface Entity {
text: string;
type: string;
startPos: number;
endPos: number;
confidence: number;
}

export interface SentimentResult {
sentiment: 'positive' | 'negative' | 'neutral';
score: number;
confidence: number;
}

export interface NLPDetectLanguageRequest {
text: string;
}

export interface NLPDetectLanguageResponse {
language: string;
confidence: number;
processingTime: number;
}

export interface NLPExtractEntitiesRequest {
text: string;
}

export interface NLPExtractEntitiesResponse {
text: string;
entities: Entity[];
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

// ==================== UTILIDADES DB MODELS ====================

/**
 * Registro de paridad cambiaria desde Access DB
 */
export interface ParityRecord {
  Paridad_fecha: Date;
  Paridad_FechaCorrespondeA: Date;
  Paridad_DOLAR: number;
  Paridad_EURO: number;
}

/**
 * Tipo de moneda para consultas de paridad
 */
export type CurrencyType = 'DOLAR' | 'EURO' | 'AMBAS';

/**
 * Registro de actividad desde Access DB (tabla `Actividades` de `Utilidades.mdb`).
 * Esquema real verificado contra la base (no hay `Actividad_ID`; la PK es el código).
 * Los campos `Actividad_Definicion` y `Actividad_ImplicaProvisorio` contienen RTF crudo.
 */
export interface ActividadRecord {
  Actividad_Codigo: string;
  Actividad_Descripcion: string;
  Actividad_Representa: number;
  Actividad_Observaciones: string;
  Actividad_ColorHojaRGB: number;
  Actividad_Definicion: string;
  Actividad_Implica: number;
  Actividad_ImplicaProvisorio: string;
  Actividad_PTGNumero: number;
  Actividad_PTGVersion: number;
}

/**
 * Registro de texto desde Access DB (tabla Textos).
 * Los nombres de columnas son los reales del esquema provisto.
 * Se omite Texto_DetalleRTF en las consultas por ser marcado RTF crudo.
 */
export interface TextoRecord {
  Texto_Codigo: number;
  Texto_DescripcionGeneral: string;
  Texto_Detalle: string;
  Texto_Tipo: number;
  Texto_Clasificacion: number;
}

/**
 * Registro de criterio desde Access DB (tabla Criterios en Criterios.mdb).
 * Los nombres de columnas son los reales del esquema (verificados por introspección).
 */
export interface CriterioRecord {
  Criterio_ListaPrecios_Codigo: number;
  Criterio_Familia_Codigo: number;
  Criterio_Grupo_Codigo: number;
  Criterio_SubGrupo_Codigo: number;
  Criterio_SubGrupo_Nombre: string;
  Criterio_Descuento: number;
  Criterio_Moneda: number;
  Criterio_Descripcion: string | null;
  Criterio_Activo: boolean;
}

/**
 * Registro de empleado desde Access DB.
 * NOTA: los nombres de columnas siguen la convención del proyecto
 * (ej. Empleados→Empleado_*) pero deben CONFIRMARSE contra la tabla real.
 */
export interface EmpleadoRecord {
  Empleado_ID: number;
  Empleado_Codigo: string;
  Empleado_Nombre: string;
  Empleado_Apellido: string;
  Empleado_DNI: string;
  Empleado_Vinculado: string;
}