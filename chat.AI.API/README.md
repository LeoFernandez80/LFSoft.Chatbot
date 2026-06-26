# Mandi.AI API

Sistema de chat reutilizable y modular con gestión completa de sesiones y procesamiento inteligente de m

## 🌟 Características Principales

### ✅ Gestión de Sesiones

- ✨ Creación y manejo completo del ciclo de vida de sesiones
- 🔄 Soporte multi-dispositivo (resumir sesiones entre dispositivos)
- 💾 Almacenamiento en dos capas (Redis para cache + DB para persistencia)
- ⏰ Expiración automática y timeouts configurables
- 🔄 Recuperación de sesiones tras crashes
- 👤 Transferencia a agentes humanos
- 🔐 Actualización de sesiones anónimas a autenticadas

### 🤖 Procesador de Mensajes

- 📬 Sistema de colas con prioridades (high, normal, low)
- 🔄 Reintentos automáticos con exponential backoff
- 💀 Dead Letter Queue para mensajes fallidos
- 👷 Worker pool con concurrencia configurable
- ⚡ Procesamiento síncrono y asíncrono

### 🎯 Pipeline de Procesamiento (6 Etapas)

1. **Preprocessor**: Normalización, corrección ortográfica, detección de idioma
2. **Context Loader**: Carga sesión, tenant config, perfil de usuario
3. **Intent Classifier**: Clasificación de intenciones (rules + LLM)
4. **Action Router**: Enrutamiento a handlers específicos por intención
5. **Response Generator**: Generación de respuestas (templates + LLM)
6. **Postprocessor**: Formateo final, guardado, analytics

### 🎨 Simulaciones Incluidas

- **Redis Simulator**: Cache en memoria con TTL, sets, sorted sets
- **Database Simulator**: CRUD operations, queries, índices
- **LLM Simulator**: Generación de texto y clasificación de intenciones
- **NLP Simulator**: Extracción de entidades, análisis de sentimiento

## 🚀 Inicio Rápido

### Instalación

```bash
cd Mandi.AI.API
npm install
```

### Desarrollo

```bash
npm run dev
```

### Producción
```bash
npm run build
npm start
```

El servidor estará disponible en `http://localhost:3001`

## 📚 API Endpoints

### Health Check

```http
GET /api/health
```

### Sesiones

#### Crear Sesión

```http
POST /api/sessions
Content-Type: application/json

{
"userId": "user-123",
"tenantId": "empresa-a",
"channel": "web",
"metadata": {
"device": "desktop",
"userAgent": "Mozilla/5.0..."
}
}
```

#### Obtener Sesión

```http
GET /api/sessions/:sessionId
```

#### Cerrar Sesión

```http
POST /api/sessions/:sessionId/close
Content-Type: application/json

{
"reason": "user_ended"
}
```

#### Obtener Sesiones Activas de Usuario

```http
GET /api/users/:userId/sessions
```

### Mensajes
#### Enviar Mensaje (Síncrono)

```http
POST /api/chat/message
Content-Type: application/json

{
"sessionId": "sess-abc-123",
"userId": "user-123",
"tenantId": "empresa-a",
"message": {
"content": "¿Cuánto cuesta la laptop Dell XPS 13?",
"type": "text"
},
"metadata": {
"channel": "web"
}
}
```

**Respuesta:**

```json
{
"sessionId": "sess-abc-123",
"message": {
"id": "msg-xyz-789",
"type": "text",
"content": "El precio de Laptop Dell XPS 13 es $1299.99 USD. Tenemos 15 unidades disponibles.",
"quickReplies": [],
"attachments": [],
"timestamp": "2026-06-18T10:30:00.000Z"
},
"metadata": {
"processingTime": 150,
"intent": "consulta_precio"
}
}
```

#### Enviar Mensaje (Asíncrono)

```http
POST /api/chat/message/async
Content-Type: application/json

{
"sessionId": "sess-abc-123",
"userId": "user-123",
"tenantId": "empresa-a",
"message": {
"content": "Hola, necesito ayuda",
"type": "text"
},
"priority": "high"
}
```

**Respuesta:**
```json
{
"messageId": "msg-123",
"status": "queued"
}
```

#### Obtener Historial

```http
GET /api/chat/history/:sessionId?limit=50&offset=0
```

### Colas

#### Estadísticas de Colas

```http
GET /api/queue/stats
```

**Respuesta:**

```json
{
"high": 0,
"normal": 5,
"low": 2,
"total": 7,
"deadLetter": 0
}
```

### Admin

#### Limpiar Sesiones Expiradas

```http
POST /api/admin/cleanup-sessions
```

#### Estadísticas del Sistema

```http
GET /api/admin/stats
```

## 🎯 Ejemplos de Uso

### Ejemplo 1: Conversación Completa

```bash
# 1. Crear sesión
curl -X POST http://localhost:3001/api/sessions \
-H "Content-Type: application/json" \
-d '{
"userId": "user-123",
"tenantId": "empresa-a",
"channel": "web"
}'
# Respuesta: { "sessionId": "sess-abc-123", ... }

# 2. Enviar saludo
curl -X POST http://localhost:3001/api/chat/message \
-H "Content-Type: application/json" \
-d '{
"sessionId": "sess-abc-123",
"userId": "user-123",
"tenantId": "empresa-a",
"message": {
"content": "Hola",
"type": "text"
}
}'

# 3. Consultar precio
curl -X POST http://localhost:3001/api/chat/message \
-H "Content-Type: application/json" \
-d '{
"sessionId": "sess-abc-123",
"userId": "user-123",
"tenantId": "empresa-a",
"message": {
"content": "¿Cuánto cuesta el iPhone 15 Pro?",
"type": "text"
}
}'

# 4. Cerrar sesión
curl -X POST http://localhost:3001/api/sessions/sess-abc-123/close \
-H "Content-Type: application/json" \
-d '{ "reason": "user_ended" }'
```

### Ejemplo 2: Consulta de Stock

```javascript
const response = await fetch("http://localhost:3001/api/chat/message", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
sessionId: "sess-abc-123",
userId: "user-123",
tenantId: "empresa-a",
message: {
content: "¿Tienen disponible el Samsung Galaxy S24?",
type: "text",
},
}),
});

const result = await response.json();
console.log(result.message.content);
// "Tenemos 30 unidades de Samsung Galaxy S24 en stock."
```

## 🏗 Arquitectura

```
Mandi.AI.API/
├── src/
│ ├── api/ # HTTP Endpoints
│ │ └── routes.ts
│ ├── core/ # Lógica principal
│ │ ├── session/ # Gestión de sesiones
│ │ │ └── SessionManager.ts
│ │ ├── processor/ # Procesamiento de mensajes
│ │ │ ├── MessageQueue.ts
│ │ │ ├── MessageWorker.ts
│ │ │ └── MessageProcessor.ts
│ │ └── pipeline/ # Pipeline de procesamiento
│ │ ├── MessagePipeline.ts
│ │ ├── stages/ # Etapas del pipeline
│ │ │ ├── PreprocessorStage.ts
│ │ │ ├── ContextLoaderStage.ts
│ │ │ ├── IntentClassifierStage.ts
│ │ │ ├── ActionRouterStage.ts
│ │ │ ├── ResponseGeneratorStage.ts
│ │ │ └── PostprocessorStage.ts
│ │ └── handlers/ # Handlers de intenciones
│ │ └── ActionHandlers.ts
│ ├── models/ # Tipos y modelos
│ │ └── types.ts
│ ├── simulaciones/ # Servicios simulados
│ │ ├── cache/
│ │ │ └── RedisSimulator.ts
│ │ ├── database/
│ │ │ └── DatabaseSimulator.ts
│ │ ├── llm/
│ │ │ └── LLMSimulator.ts
│ │ └── nlp/
│ │ └── NLPSimulator.ts
│ └── index.ts # Entry point
├── package.json
├── tsconfig.json
└── README.md
```

## 🔧 Configuración

### Variables de Entorno

```bash
PORT=3001 # Puerto del servidor
NODE_ENV=development # Ambiente
```

### Configuración de Tenant

Los tenants se configuran en la base de datos con la siguiente estructura:

```typescript
{
tenantId: 'empresa-a',
name: 'Empresa A S.A.',
active: true,
intents: ['saludo', 'despedida', 'consulta_precio', ...],
templates: {
saludo: '¡Hola! Bienvenido a {name}',
despedida: '¡Hasta luego!'
},
aiConfig: {
provider: 'openai',
model: 'gpt-4',
temperature: 0.7
}
}
```

## 🎨 Intenciones Soportadas

- **saludo**: Saludos iniciales
- **despedida**: Despedidas
- **consulta_precio**: Consultar precio de productos
- **consulta_stock**: Consultar disponibilidad
- **realizar_compra**: Iniciar proceso de compra
- **rastrear_pedido**: Rastrear estado de pedido
- **soporte_tecnico**: Solicitar soporte
- **queja**: Registrar quejas
- **otro**: Intenciones no clasificadas

##📊 Datos de Prueba

El sistema incluye datos de prueba al iniciar:

- **Tenant**: empresa-a
- **Productos**: 5 productos de tecnología (laptops, celulares)
- **Usuario**: user-123 (VIP tier)

##🔍 Monitoreo

### Estadísticas del Sistema

```bash
curl http://localhost:3001/api/admin/stats
```

### Estadísticas de Colas

```bash
curl http://localhost:3001/api/queue/stats
```

### Estado de Workers

Los workers se registran en la consola al iniciar y muestran logs de actividad.

##🚀 Próximos Pasos

Para adaptar este sistema a tu empresa:

1. **Configurar Tenant**: Crear configuración específica en la base de datos
2. **Agregar Productos/Datos**: Poblar con tus datos reales
3. **Customizar Intenciones**: Definir intenciones específicas de tu negocio
4. **Conectar Data Sources**: Implementar conectores a tus sistemas (CRM, ERP, etc.)
5. **Integrar LLM Real**: Reemplazar simulador con OpenAI, Claude, etc.
6. **Deploy**: Desplegar en tu infraestructura

##📝 Licencia
MIT

##👥 Autor

Mandi.AI Team