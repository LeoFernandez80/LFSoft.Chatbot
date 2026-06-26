/**
* API Routes - Endpoints HTTP
*/

import express, { Request, Response } from 'express';
import { sessionManager } from '../core/session/SessionManager';
import { messageProcessor } from '../core/processor/MessageProcessor';
import { messageQueue } from '../core/processor/MessageQueue';
import { ConnectorFactory } from '../connectors';
import { getCsv } from '../core/utils/tools/CsvStorage';

export const router = express.Router();

// ==================== HEALTH CHECK ====================

router.get('/health', (req: Request, res: Response) => {
console.log('[API] GET /health');
res.json({
status: 'healthy',
timestamp: new Date(),
version: '1.0.0'
});
});

// ==================== SESSION ENDPOINTS ====================

/**
* POST /api/sessions
* Crear nueva sesión
*/
router.post('/sessions', async (req: Request, res: Response) => {
console.log('[API] POST /sessions');
try {
const { userId, tenantId, channel, metadata } = req.body;

if (!userId || !tenantId) {
return res.status(400).json({
error: 'userId and tenantId are required'
});
}

const sessionId = await sessionManager.createSession(
userId,
tenantId,
channel,
metadata
);

const session = await sessionManager.getSession(sessionId);

res.status(201).json({
sessionId,
session
});
} catch (error: any) {
res.status(500).json({
error: 'Failed to create session',
message: error.message
});
}
});

/**
* GET /api/sessions/:sessionId
* Obtener sesión
*/
router.get('/sessions/:sessionId', async (req: Request, res: Response) => {
console.log(`[API] GET /sessions/${req.params.sessionId}`);
try {
const { sessionId } = req.params;

const session = await sessionManager.getSession(sessionId);

if (!session) {
return res.status(404).json({
error: 'Session not found'
});
}

res.json({ session });
} catch (error: any) {
res.status(500).json({
error: 'Failed to get session',
message: error.message
});
}
});

/**
* POST /api/sessions/:sessionId/close
* Cerrar sesión
*/
router.post('/sessions/:sessionId/close', async (req: Request, res: Response) => {
console.log(`[API] POST /sessions/${req.params.sessionId}/close`);
try {
const { sessionId } = req.params;
const { reason } = req.body;

const session = await sessionManager.closeSession(sessionId, reason);

res.json({
message: 'Session closed',
session
});
} catch (error: any) {
res.status(500).json({
error: 'Failed to close session',
message: error.message
});
}
});

/**
* GET /api/users/:userId/sessions
* Obtener sesiones activas de un usuario
*/
router.get('/users/:userId/sessions', async (req: Request, res: Response) => {
console.log(`[API] GET /users/${req.params.userId}/sessions`);
try {
const { userId } = req.params;

const sessions = await sessionManager.getUserActiveSessions(userId);

res.json({ sessions });
} catch (error: any) {
res.status(500).json({
error: 'Failed to get user sessions',
message: error.message
});
}
});

// ==================== MESSAGE ENDPOINTS ====================

/**
* POST /api/chat/message
* Enviar mensaje (procesamiento síncrono)
*/
router.post('/chat/message', async (req: Request, res: Response) => {
console.log('[API] POST /chat/message');
try {
const response = await messageProcessor.processSync(req.body);

res.json(response);
} catch (error: any) {
res.status(500).json({
error: 'Failed to process message',
message: error.message
});
}
});

/**
* POST /api/chat/message/async
* Enviar mensaje (procesamiento asíncrono)
*/
router.post('/chat/message/async', async (req: Request, res: Response) => {
console.log('[API] POST /chat/message/async');
try {
const { priority } = req.body;

const result = await messageProcessor.processAsync(req.body, priority);

res.status(202).json(result);
} catch (error: any) {
res.status(500).json({
error: 'Failed to queue message',
message: error.message
});
}
});

/**
* GET /api/chat/history/:sessionId
* Obtener historial de mensajes
*/
router.get('/chat/history/:sessionId', async (req: Request, res: Response) => {
console.log(`[API] GET /chat/history/${req.params.sessionId}`);
try {
  const { sessionId } = req.params;
  const { limit = 50, offset = 0 } = req.query;
  const db = await ConnectorFactory.getDatabase();

  const query = await db.collection('session_messages').find({ session_id: sessionId });
  const messages = await query.sort({ timestamp: -1 }).skip(Number(offset)).limit(Number(limit)).toArray();
  const total = await db.collection('session_messages').count({ session_id: sessionId });

  res.json({ sessionId, messages, total });
} catch (error: any) {
  res.status(500).json({
error: 'Failed to get message history',
message: error.message
});
}
});

// ==================== QUEUE ENDPOINTS ====================

/**
* GET /api/queue/stats
* Obtener estadísticas de colas
*/
router.get('/queue/stats', async (req: Request, res: Response) => {
console.log('[API] GET /queue/stats');
try {
const stats = await messageQueue.getStats();

res.json(stats);
} catch (error: any) {
res.status(500).json({
error: 'Failed to get queue stats',
message: error.message
});
}
});

// ==================== ADMIN ENDPOINTS ====================

/**
* POST /api/admin/cleanup-sessions
* Limpiar sesiones expiradas
*/
router.post('/api/admin/cleanup-sessions', async (req: Request, res: Response) => {
console.log('[API] POST /api/admin/cleanup-sessions');
try {
const cleanedCount = await sessionManager.cleanupExpiredSessions();

res.json({
message: 'Sessions cleaned',
count: cleanedCount
});
} catch (error: any) {
res.status(500).json({
error: 'Failed to cleanup sessions',
message: error.message
});
}
});

/**
* GET /api/admin/stats
* Estadísticas generales del sistema
*/
router.get('/admin/stats', async (req: Request, res: Response) => {
console.log('[API] GET /admin/stats');
try {
const db = await ConnectorFactory.getDatabase();
const queueStats = await messageQueue.getStats();
const sessionCount = await db.collection('sessions').count({});
const activeSessionCount = await db.collection('sessions').count({ state: 'ACTIVE' });

res.json({
queue: queueStats,
sessions: {
total: sessionCount,
active: activeSessionCount
},
timestamp: new Date()
});
} catch (error: any) {
res.status(500).json({
error: 'Failed to get stats',
message: error.message
});
}
});

// ==================== UTILIDADES ENDPOINTS ====================

/**
 * GET /api/utilidades/paridad
 * Consultar paridad cambiaria desde Access DB
 * Query params:
 *   - moneda: DOLAR | EURO | AMBAS (default: AMBAS)
 *   - fecha: YYYY-MM-DD (default: última disponible)
 */
router.get('/utilidades/paridad', async (req: Request, res: Response) => {
  console.log('[API] GET /utilidades/paridad');
  try {
    const accessDb = await ConnectorFactory.getAccessUtilitiesDatabase();
    const moneda = (req.query.moneda as string)?.toUpperCase() || 'AMBAS';

    // Consultar última paridad disponible
    const sql = `
      SELECT TOP 1 
        Paridad_fecha, 
        Paridad_FechaCorrespondeA, 
        Paridad_DOLAR, 
        Paridad_EURO 
      FROM Paridades 
      ORDER BY Paridad_fecha DESC
    `;

    const results = await accessDb.executeQuery(sql);

    if (!results || results.length === 0) {
      return res.status(404).json({
        error: 'No parity data available'
      });
    }

    const parity = results[0];

    // Formatear respuesta según moneda solicitada
    let response: any;
    switch (moneda) {
      case 'DOLAR':
        response = {
          moneda: 'USD',
          valor: parity.Paridad_DOLAR,
          fecha: parity.Paridad_fecha,
          fechaCorrespondeA: parity.Paridad_FechaCorrespondeA
        };
        break;

      case 'EURO':
        response = {
          moneda: 'EUR',
          valor: parity.Paridad_EURO,
          fecha: parity.Paridad_fecha,
          fechaCorrespondeA: parity.Paridad_FechaCorrespondeA
        };
        break;

      case 'AMBAS':
      default:
        response = {
          dolar: parity.Paridad_DOLAR,
          euro: parity.Paridad_EURO,
          fecha: parity.Paridad_fecha,
          fechaCorrespondeA: parity.Paridad_FechaCorrespondeA
        };
        break;
    }

    res.json(response);

  } catch (error: any) {
    console.error('[API] Error querying parity:', error.message);
    res.status(500).json({
      error: 'Failed to query parity data',
      message: error.message
    });
  }
});

export default router;

// ==================== CSV DOWNLOAD ====================

/**
 * GET /api/csv/:id
 * Descargar un archivo CSV generado temporalmente.
 * Los archivos expiran después de 1 hora.
 */
router.get('/csv/:id', (req: Request, res: Response) => {
  const { id } = req.params;

// Validar formato UUID básico para evitar path traversal
if (!/^[0-9a-f-]{36}$/i.test(id)) {
return res.status(400).json({ error: 'ID inválido' });
}

const entry = getCsv(id);

if (!entry) {
return res.status(404).json({ error: 'Archivo no encontrado o expirado' });
}

res.setHeader('Content-Type', 'text/csv; charset=utf-8');
res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(entry.filename)}"`);
// BOM para compatibilidad con Excel
res.send('\uFEFF' + entry.content);
});