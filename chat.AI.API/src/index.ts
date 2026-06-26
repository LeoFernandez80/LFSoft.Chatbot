/**
* Mandi.AI API - Main Entry Point
* Sistema de chat reutilizable con gestión de sesiones y procesamiento de mensajes
*/

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { router } from './api/routes';
import { workerPool } from './core/processor/MessageWorker';
import { sessionManager } from './core/session/SessionManager';
import { ConnectorFactory } from './connectors';
import { Product } from './models/types';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
next();
});

// Static UI
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api', router);

// Root → Chat UI
app.get('/', (req, res) => {
res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
console.error('Unhandled error:', err);
res.status(500).json({
error: 'Internal server error',
message: err.message
});
});

/**
* Inicializar datos de prueba
*/
async function initializeTestData() {
console.log('📦 Initializing test data...');
const db = await ConnectorFactory.getDatabase();

// Crear tenant de prueba
const testTenant = {
    tenantId: 'empresa-b',
    name: 'Empresa B S.A.',
    slug: 'empresa-b',
    active: true,
    intents: [
        'saludo',
        'despedida',
        'consulta_precio',
        'realizar_compra',
        'rastrear_pedido',
        'soporte_tecnico',
        'queja',
        'search_parity',
        'otro'
    ],
    templates: {
      saludo: '¡Hola! Bienvenido a Empresa A. ¿En qué puedo ayudarte?',
      despedida: '¡Hasta luego! Gracias por contactarnos.',
      search_parity: 'La paridad del dólar es ${dolar} y del euro es ${euro} (fecha: ${fecha})'
    }
  };

  await db.collection('tenants').insert(testTenant);

  // Crear productos de prueba
  const productCatalog = [
{ type: 'Tablet', name: 'iPad Pro 12.9', desc: 'Tablet Apple con chip M2 y pantalla Liquid Retina', price: 1099.99, cat: 'Electrónica', brand: 'Apple' },
{ type: 'Smart TV', name: 'Samsung 4K QLED 55"', desc: 'Smart TV QLED 4K con HDR', price: 799.99, cat: 'Electrónica', brand: 'Samsung' },
{ type: 'Consola', name: 'PlayStation 5', desc: 'Consola de videojuegos Sony de última generación', price: 499.99, cat: 'Electrónica', brand: 'Sony' },
{ type: 'Consola', name: 'Xbox Series X', desc: 'Consola de videojuegos Microsoft 4K', price: 499.99, cat: 'Electrónica', brand: 'Microsoft' },
{ type: 'Consola', name: 'Nintendo Switch OLED', desc: 'Consola híbrida con pantalla OLED', price: 349.99, cat: 'Electrónica', brand: 'Nintendo' },
{ type: 'Cámara', name: 'GoPro Hero 12', desc: 'Cámara de acción 4K con estabilización', price: 399.99, cat: 'Electrónica', brand: 'GoPro' },
{ type: 'Cámara', name: 'Canon EOS R6 Mark II', desc: 'Cámara mirrorless full-frame 40MP', price: 2499.99, cat: 'Electrónica', brand: 'Canon' },
{ type: 'Altavoz', name: 'Bose SoundLink Max', desc: 'Altavoz Bluetooth portátil premium', price: 399.99, cat: 'Electrónica', brand: 'Bose' },
{ type: 'Smartwatch', name: 'Apple Watch Series 9', desc: 'Smartwatch con sensor de oxígeno y ECG', price: 399.99, cat: 'Electrónica', brand: 'Apple' },
{ type: 'Smartwatch', name: 'Samsung Galaxy Watch 6', desc: 'Smartwatch con monitoreo de salud avanzado', price: 349.99, cat: 'Electrónica', brand: 'Samsung' },
{ type: 'Laptop', name: 'Asus ROG Zephyrus G14', desc: 'Laptop gaming con AMD Ryzen 9 y RTX 4060', price: 1499.99, cat: 'Electrónica', brand: 'Asus' },
{ type: 'Mouse', name: 'Razer DeathAdder V3', desc: 'Mouse gaming ergonómico 30000 DPI', price: 79.99, cat: 'Electrónica', brand: 'Razer' },
{ type: 'Mouse', name: 'Logitech MX Master 3S', desc: 'Mouse inalámbrico para productividad', price: 99.99, cat: 'Electrónica', brand: 'Logitech' },
{ type: 'Teclado', name: 'Corsair K100 RGB', desc: 'Teclado mecánico gaming con switches Cherry', price: 199.99, cat: 'Electrónica', brand: 'Corsair' },
{ type: 'Monitor', name: 'LG UltraWide 34"', desc: 'Monitor ultrawide QHD 144Hz', price: 699.99, cat: 'Electrónica', brand: 'LG' },
{ type: 'Monitor', name: 'BenQ PD3220U', desc: 'Monitor 4K para diseñadores con Thunderbolt 3', price: 799.99, cat: 'Electrónica', brand: 'BenQ' },
{ type: 'Drone', name: 'DJI Mini 4 Pro', desc: 'Drone compacto 4K con obstáculos omnidireccionales', price: 499.99, cat: 'Electrónica', brand: 'DJI' },
{ type: 'E-reader', name: 'Kindle Paperwhite 11', desc: 'E-reader con luz ajustable y resistencia al agua', price: 129.99, cat: 'Electrónica', brand: 'Amazon' },
{ type: 'Batería', name: 'Anker PowerCore 26800', desc: 'Batería portátil 26800mAh con carga rápida', price: 79.99, cat: 'Electrónica', brand: 'Anker' },
{ type: 'Smartphone', name: 'Google Pixel 8 Pro', desc: 'Smartphone Android con cámara de 50MP y IA', price: 899.99, cat: 'Electrónica', brand: 'Google' },
{ type: 'Smartphone', name: 'OnePlus 12', desc: 'Smartphone con Snapdragon 8 Gen 3 y carga 100W', price: 799.99, cat: 'Electrónica', brand: 'OnePlus' },
{ type: 'Auriculares', name: 'Jabra Evolve2 85', desc: 'Auriculares profesionales con ANC y micrófono', price: 299.99, cat: 'Electrónica', brand: 'Jabra' },
{ type: 'Controlador', name: 'Elgato Stream Deck MK.2', desc: 'Controlador de streaming con 15 teclas', price: 249.99, cat: 'Electrónica', brand: 'Elgato' },
{ type: 'Micrófono', name: 'Blue Yeti X', desc: 'Micrófono USB profesional para streaming y podcast', price: 169.99, cat: 'Electrónica', brand: 'Blue' },
{ type: 'Tableta Gráfica', name: 'Wacom Intuos Pro L', desc: 'Tableta gráfica profesional inalámbrica', price: 499.99, cat: 'Electrónica', brand: 'Wacom' },
{ type: 'NAS', name: 'Synology DS923+', desc: 'NAS 4 bahías para almacenamiento en red', price: 549.99, cat: 'Electrónica', brand: 'Synology' },
{ type: 'SSD', name: 'Samsung T9 4TB', desc: 'SSD externo portátil con USB 3.2 Gen 2x2', price: 359.99, cat: 'Electrónica', brand: 'Samsung' },
{ type: 'SSD', name: 'WD Black SN850X 2TB', desc: 'SSD NVMe PCIe 4.0 para gaming y workstation', price: 299.99, cat: 'Electrónica', brand: 'Western Digital' },
{ type: 'RAM', name: 'Corsair Vengeance 32GB DDR5', desc: 'Kit de RAM DDR5 6000MHz para gaming', price: 199.99, cat: 'Electrónica', brand: 'Corsair' },
{ type: 'Tarjeta Gráfica', name: 'NVIDIA RTX 4070 Super', desc: 'Tarjeta gráfica para gaming 4K y realidad virtual', price: 699.99, cat: 'Electrónica', brand: 'NVIDIA' },
{ type: 'Procesador', name: 'AMD Ryzen 9 7950X', desc: 'Procesador de 16 núcleos para workstation', price: 799.99, cat: 'Electrónica', brand: 'AMD' },
{ type: 'Gabinete', name: 'NZXT H9 Flow', desc: 'Gabinete ATX con flujo de aire optimizado', price: 199.99, cat: 'Electrónica', brand: 'NZXT' },
{ type: 'Fuente de Poder', name: 'Thermaltake Toughpower 850W', desc: 'Fuente de poder 80+ Gold modular', price: 149.99, cat: 'Electrónica', brand: 'Thermaltake' },
{ type: 'Pulsera Fitness', name: 'Fitbit Charge 6', desc: 'Pulsera de actividad con GPS y monitoreo de salud', price: 129.99, cat: 'Electrónica', brand: 'Fitbit' },
{ type: 'Smartwatch', name: 'Garmin Fenix 7X', desc: 'Smartwatch multideporte con GPS y solar', price: 699.99, cat: 'Electrónica', brand: 'Garmin' },
{ type: 'Kit Iluminación', name: 'Philips Hue Starter Kit', desc: 'Kit de iluminación inteligente RGB', price: 199.99, cat: 'Electrónica', brand: 'Philips' },
{ type: 'Timbre Inteligente', name: 'Ring Video Doorbell Pro 2', desc: 'Timbre inteligente con visión nocturna', price: 249.99, cat: 'Electrónica', brand: 'Ring' },
{ type: 'Robot Aspiradora', name: 'Roomba j9+', desc: 'Robot aspiradora con vaciado automático y mapeo inteligente', price: 999.99, cat: 'Electrónica', brand: 'iRobot' },
{ type: 'Olla Eléctrica', name: 'Instant Pot Pro 8QT', desc: 'Olla a presión eléctrica multipropósito', price: 149.99, cat: 'Electrónica', brand: 'Instant Pot' },
{ type: 'Aspiradora', name: 'Dyson V15 Detect', desc: 'Aspiradora inalámbrica con detección láser', price: 699.99, cat: 'Electrónica', brand: 'Dyson' },
{ type: 'Cafetera', name: 'Nespresso Vertuo Next', desc: 'Cafetera de cápsulas con centrifugación', price: 199.99, cat: 'Electrónica', brand: 'Nespresso' },
{ type: 'Visor VR', name: 'Oculus Quest 3', desc: 'Visor de realidad mixta standalone 4K', price: 499.99, cat: 'Electrónica', brand: 'Oculus' },
{ type: 'Router', name: 'TP-Link Archer AXE300', desc: 'Router WiFi 6E tribanda con cobertura 330m²', price: 299.99, cat: 'Electrónica', brand: 'TP-Link' },
{ type: 'Router', name: 'Ubiquiti Dream Machine Pro', desc: 'Router empresarial con UniFi OS integrado', price: 399.99, cat: 'Electrónica', brand: 'Ubiquiti' }
];

const shuffled = productCatalog.sort(() => Math.random() - 0.5);
const selected = shuffled.slice(0, 50);

const products: Product[] = selected.map((p, i) => ({
id: String(i + 1),
name: `${p.type} ${p.name}`,
description: p.desc,
price: p.price,
currency: 'USD',
stock: Math.floor(Math.random() * 50) + 1,
category: p.cat,
brand: p.brand,
available: Math.random() > 0.1
}));

for (const product of products) {
await db.collection('products').insert(product);
}

// Crear usuario de prueba
const testUser = {
userId: 'user-123',
tenantId: 'empresa-a',
name: 'Juan Pérez',
email: 'juan@example.com',
tier: 'VIP',
previousPurchases: 5,
registeredAt: new Date()
};

await db.collection('users').insert(testUser);

console.log('✅ Test data initialized');
console.log(` - Tenant: ${testTenant.name}`);
console.log(` - Products: ${products.length}`);
console.log(` - Users: 1`);
}

/**
* Iniciar servidor
*/
async function startServer() {
try {
console.log('\n🚀 Starting Mandi.AI API...\n');

// Inicializar conectores
await ConnectorFactory.getDatabase();
await ConnectorFactory.getCache();

// Inicializar datos de prueba
await initializeTestData();

// Iniciar worker pool
console.log('\n👷 Starting message workers...');
await workerPool.start();

// Iniciar servidor HTTP
const server = app.listen(PORT, '0.0.0.0', () => {
console.log('\n✨ Mandi.AI API is running!');
console.log(`\n📍 Server: http://localhost:${PORT}`);
console.log(`📍 Health: http://localhost:${PORT}/api/health`);
console.log(`📍 Stats: http://localhost:${PORT}/api/admin/stats`);
console.log('\n📚 API Endpoints:');
console.log(' POST /api/sessions');
console.log(' GET /api/sessions/:sessionId');
console.log(' POST /api/chat/message');
console.log(' GET /api/chat/history/:sessionId');
console.log(' GET /api/queue/stats');
console.log('\n✅ Ready to process messages!\n');
});

server.on('error', (error: any) => {
console.error('Server error:', error);
if (error.code === 'EADDRINUSE') {
console.error(`Port ${PORT} is already in use`);
process.exit(1);
}
});

// Cleanup job cada 5 minutos
setInterval(async () => {
console.log('🧹 Running cleanup job...');
await sessionManager.cleanupExpiredSessions();
}, 5 * 60 * 1000);

} catch (error) {
console.error('❌ Failed to start server:', error);
process.exit(1);
}
}

// Manejo de señales
process.on('SIGTERM', () => {
console.log('\n⚠ SIGTERM received, shutting down gracefully...');
workerPool.stopAll();
ConnectorFactory.disconnectAll();
process.exit(0);
});

process.on('SIGINT', () => {
console.log('\n⚠ SIGINT received, shutting down gracefully...');
workerPool.stopAll();
ConnectorFactory.disconnectAll();
process.exit(0);
});

// Iniciar
startServer();