/**
* Script de Ejemplo - Test del Sistema
* Demuestra cómo usar la API de Mandi.AI
*/

const API_BASE = 'http://localhost:3001/api';

async function delay(ms: number) {
return new Promise(resolve => setTimeout(resolve, ms));
}

async function request(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
const options: RequestInit = {
method,
headers: {
'Content-Type': 'application/json'
}
};

if (body) {
options.body = JSON.stringify(body);
}

const response = await fetch(`${API_BASE}${endpoint}`, options);

if (!response.ok) {
const error: any = await response.json();
throw new Error(`API Error: ${error.message}`);
}

return await response.json();
}

async function main() {
console.log('🚀 Iniciando prueba del sistema Mandi.AI\n');

try {
// 1. Crear sesión
console.log('1️⃣ Creando sesión...');
const sessionResponse = await request('/sessions', 'POST', {
userId: 'test-user-1',
tenantId: 'empresa-a',
channel: 'web',
metadata: {
device: 'desktop',
userAgent: 'Test Script'
}
});

const sessionId = sessionResponse.sessionId;
console.log(` ✅ Sesión creada: ${sessionId}\n`);

await delay(500);

// 2. Enviar saludo
console.log('2️⃣ Enviando saludo...');
const greeting = await request('/chat/message', 'POST', {
sessionId,
userId: 'test-user-1',
tenantId: 'empresa-a',
message: {
content: 'Hola, buenos días',
type: 'text'
}
});

console.log(` Bot: ${greeting.message.content}\n`);

await delay(1000);

// 3. Consultar precio
console.log('3️⃣ Consultando precio de producto...');
const priceQuery = await request('/chat/message', 'POST', {
sessionId,
userId: 'test-user-1',
tenantId: 'empresa-a',
message: {
content: '¿Cuánto cuesta la laptop Dell XPS 13?',
type: 'text'
}
});

console.log(` Bot: ${priceQuery.message.content}`);
console.log(` Intent: ${priceQuery.metadata.intent}`);
console.log(` Tiempo: ${priceQuery.metadata.processingTime}ms\n`);

await delay(1000);

// 4. Consultar stock
console.log('4️⃣ Consultando stock...');
const stockQuery = await request('/chat/message', 'POST', {
sessionId,
userId: 'test-user-1',
tenantId: 'empresa-a',
message: {
content: '¿Tienen disponible el iPhone 15 Pro?',
type: 'text'
}
});

console.log(` Bot: ${stockQuery.message.content}\n`);

await delay(1000);

// 5. Consultar producto inexistente
console.log('5️⃣ Probando con producto inexistente...');
const notFound = await request('/chat/message', 'POST', {
sessionId,
userId: 'test-user-1',
tenantId: 'empresa-a',
message: {
content: '¿Cuánto cuesta el producto XYZ123?',
type: 'text'
}
});
console.log(` Bot: ${notFound.message.content}\n`);

await delay(1000);

// 6. Despedida
console.log('6️⃣ Enviando despedida...');
const farewell = await request('/chat/message', 'POST', {
sessionId,
userId: 'test-user-1',
tenantId: 'empresa-a',
message: {
content: 'Gracias, adiós',
type: 'text'
}
});

console.log(` Bot: ${farewell.message.content}\n`);

await delay(500);

// 7. Obtener historial
console.log('7️⃣ Obteniendo historial de conversación...');
const history = await request(`/chat/history/${sessionId}`);

console.log(` Total de mensajes: ${history.total}`);
console.log(` Mensajes en respuesta: ${history.messages.length}\n`);

// 8. Ver sesión
console.log('8️⃣ Consultando estado de sesión...');
const session = await request(`/sessions/${sessionId}`);

console.log(` Estado: ${session.session.state}`);
console.log(` Mensajes en sesión: ${session.session.messages.length}`);
console.log(` Última actividad: ${session.session.lastActivityAt}\n`);

// 9. Estadísticas del sistema
console.log('9️⃣ Estadísticas del sistema...');
const stats = await request('/admin/stats');

console.log(` Cola de mensajes: ${JSON.stringify(stats.queue)}`);
console.log(` Sesiones activas: ${stats.sessions.active}`);
console.log(` Total sesiones: ${stats.sessions.total}\n`);

// 10. Cerrar sesión
console.log('🔟 Cerrando sesión...');
await request(`/sessions/${sessionId}/close`, 'POST', {
reason: 'test_completed'
});

console.log(' ✅ Sesión cerrada\n');

console.log('✨ Prueba completada exitosamente!\n');

} catch (error: any) {
console.error('❌ Error en la prueba:', error.message);
process.exit(1);
}
}

// Ejecutar si es llamado directamente
if (require.main === module) {
main();
}

export { main };