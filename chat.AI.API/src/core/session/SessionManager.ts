import { v4 as uuidv4 } from 'uuid';
import { Session, SessionState, Message, SessionContext } from '../../models/types';
import { ConnectorFactory } from '../../connectors';

export class SessionManager {
private readonly SESSION_TTL = 1800;
private readonly MAX_SESSION_DURATION = 2 * 60 * 60 * 1000;
private readonly IDLE_TIMEOUT = 30 * 60 * 1000;
private readonly WAITING_INPUT_TIMEOUT = 5 * 60 * 1000;

async createSession(
userId: string,
tenantId: string,
channel: string = 'web',
metadata: any = {}
): Promise<string> {
console.log(`[SessionManager] createSession() - userId: ${userId}, tenantId: ${tenantId}`);
const db = await ConnectorFactory.getDatabase();
const cache = await ConnectorFactory.getCache();

const sessionId = uuidv4();
const now = new Date();

const session: Session = {
sessionId,
userId,
tenantId,
startedAt: now,
lastActivityAt: now,
expiresAt: new Date(Date.now() + this.SESSION_TTL * 1000),
state: 'CREATED',
context: { entities: {} },
messages: [],
metadata: { channel, ...metadata },
isActive: true
};

await cache.setex(`session:${sessionId}`, this.SESSION_TTL, JSON.stringify(session));
await db.collection('sessions').insert({ ...session, id: sessionId });
await cache.sadd(`user_sessions:${userId}`, sessionId);
await cache.sadd(`user_devices:${userId}`, metadata.device || 'unknown');

console.log(`✅ Session created: ${sessionId} for user ${userId}`);
return sessionId;
}

async getSession(sessionId: string): Promise<Session | null> {
console.log(`[SessionManager] getSession() - sessionId: ${sessionId}`);
const db = await ConnectorFactory.getDatabase();
const cache = await ConnectorFactory.getCache();

const cached = await cache.get(`session:${sessionId}`);
if (cached) {
const session = JSON.parse(cached);
session.startedAt = new Date(session.startedAt);
session.lastActivityAt = new Date(session.lastActivityAt);
session.expiresAt = new Date(session.expiresAt);
if (session.endedAt) session.endedAt = new Date(session.endedAt);
return session;
}

const sessionDoc = await db.collection('sessions').findOne({ sessionId });
if (sessionDoc) {
const session = { ...sessionDoc } as Session;
await cache.setex(`session:${sessionId}`, this.SESSION_TTL, JSON.stringify(session));
return session;
}

return null;
}

async updateSession(sessionId: string, updates: Partial<Session>): Promise<Session> {
console.log(`[SessionManager] updateSession() - sessionId: ${sessionId}`);
const cache = await ConnectorFactory.getCache();

const session = await this.getSession(sessionId);
if (!session) throw new Error(`Session not found: ${sessionId}`);

session.lastActivityAt = new Date();
session.expiresAt = new Date(Date.now() + this.SESSION_TTL * 1000);
Object.assign(session, updates);

await cache.setex(`session:${sessionId}`, this.SESSION_TTL, JSON.stringify(session));
await cache.set(`session:${sessionId}:dirty`, '1');

return session;
}

async addMessage(sessionId: string, message: Message): Promise<void> {
console.log(`[SessionManager] addMessage() - sessionId: ${sessionId}`);
const db = await ConnectorFactory.getDatabase();

const session = await this.getSession(sessionId);
if (!session) throw new Error(`Session not found: ${sessionId}`);

session.messages.push(message);
if (session.messages.length > 20) {
session.messages = session.messages.slice(-20);
}

await this.updateSession(sessionId, { messages: session.messages });
await db.collection('session_messages').insert({ session_id: sessionId, ...message });
}

async updateContext(sessionId: string, contextUpdates: Partial<SessionContext>): Promise<void> {
console.log(`[SessionManager] updateContext() - sessionId: ${sessionId}`);
const session = await this.getSession(sessionId);
if (!session) throw new Error(`Session not found: ${sessionId}`);

session.context = { ...session.context, ...contextUpdates };
await this.updateSession(sessionId, { context: session.context });
}

async closeSession(sessionId: string, reason: string = 'user_ended'): Promise<Session> {
console.log(`[SessionManager] closeSession() - sessionId: ${sessionId}, reason: ${reason}`);
const db = await ConnectorFactory.getDatabase();
const cache = await ConnectorFactory.getCache();

const session = await this.getSession(sessionId);
if (!session) throw new Error(`Session not found: ${sessionId}`);

session.state = 'CLOSED';
session.endedAt = new Date();
session.closeReason = reason;
session.isActive = false;

await db.collection('sessions').updateOne(
{ sessionId },
{ $set: { state: 'CLOSED', endedAt: session.endedAt, closeReason: reason, isActive: false } }
);
await cache.del(`session:${sessionId}`);
await cache.srem(`user_sessions:${session.userId}`, sessionId);

console.log(`🔒 Session closed: ${sessionId} (${reason})`);
return session;
}

async extendSession(sessionId: string, additionalMinutes: number = 30): Promise<void> {
console.log(`[SessionManager] extendSession() - sessionId: ${sessionId}, +${additionalMinutes}min`);
const db = await ConnectorFactory.getDatabase();
const cache = await ConnectorFactory.getCache();

const session = await this.getSession(sessionId);
if (!session) throw new Error(`Session not found: ${sessionId}`);

const newExpiry = new Date(Date.now() + additionalMinutes * 60 * 1000);
session.expiresAt = newExpiry;

await cache.expire(`session:${sessionId}`, additionalMinutes * 60);
await db.collection('sessions').updateOne({ sessionId }, { $set: { expiresAt: newExpiry } });
}

async getUserActiveSessions(userId: string): Promise<Session[]> {
console.log(`[SessionManager] getUserActiveSessions() - userId: ${userId}`);
const cache = await ConnectorFactory.getCache();

const sessionIds = await cache.smembers(`user_sessions:${userId}`);
const sessions = await Promise.all(sessionIds.map((id: string) => this.getSession(id)));
return sessions.filter((s): s is Session => s !== null && s.state === 'ACTIVE');
}

async resumeOrCreateSession(userId: string, tenantId: string, device: string): Promise<string> {
console.log(`[SessionManager] resumeOrCreateSession() - userId: ${userId}, device: ${device}`);
const activeSessions = await this.getUserActiveSessions(userId);

if (activeSessions.length > 0) {
const latestSession = activeSessions.sort(
(a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime()
)[0];

latestSession.metadata.currentDevice = device;
await this.updateSession(latestSession.sessionId, { metadata: latestSession.metadata });
console.log(`📱 Resumed session ${latestSession.sessionId} on ${device}`);
return latestSession.sessionId;
}
return this.createSession(userId, tenantId, 'web', { device });
}

shouldExpire(session: Session): { shouldExpire: boolean; reason?: string } {
    const now = Date.now();
    const timeSinceStart = now - session.startedAt.getTime();
    const timeSinceActivity = now - session.lastActivityAt.getTime();

    if (timeSinceStart > this.MAX_SESSION_DURATION) return { shouldExpire: true, reason: 'max_duration' };
    if (timeSinceActivity > this.IDLE_TIMEOUT) return { shouldExpire: true, reason: 'idle_timeout' };
    if (session.context.waitingForUserInput && timeSinceActivity > this.WAITING_INPUT_TIMEOUT) {
      return { shouldExpire: true, reason: 'user_inactive' };
    }
    return { shouldExpire: false };
  }

async cleanupExpiredSessions(): Promise<number> {
console.log('[SessionManager] cleanupExpiredSessions()');
const db = await ConnectorFactory.getDatabase();

const query = await db.collection('sessions').find({ state: 'ACTIVE' });
const allSessions = await query.toArray();

let cleanedCount = 0;
for (const sessionDoc of allSessions) {
const session = sessionDoc as unknown as Session;
const { shouldExpire, reason } = this.shouldExpire(session);
if (shouldExpire) {
await this.closeSession(session.sessionId, reason || 'expired');
cleanedCount++;
}
}

console.log(`🧹 Cleaned up ${cleanedCount} expired sessions`);
return cleanedCount;
}

async recoverSession(sessionId: string): Promise<Session> {
const db = await ConnectorFactory.getDatabase();
const cache = await ConnectorFactory.getCache();

const sessionDoc = await db.collection('sessions').findOne({ sessionId });

if (sessionDoc) {
const session = sessionDoc as unknown as Session;
session.state = 'RECOVERED';
session.recoveredAt = new Date();

await cache.setex(`session:${sessionId}`, this.SESSION_TTL, JSON.stringify(session));
console.log(`🔄 Session recovered: ${sessionId}`);
return session;
}

const query = await db.collection('session_messages').find({ session_id: sessionId });
const messages = await query.sort({ timestamp: 1 }).toArray();

if (messages.length === 0) {
throw new Error(`Cannot recover session ${sessionId}: no data found`);
}
const firstMessage = messages[0] as any;
const recovered: Session = {
sessionId,
userId: firstMessage.userId || 'unknown',
tenantId: firstMessage.tenantId || 'unknown',
startedAt: new Date(firstMessage.timestamp),
lastActivityAt: new Date(),
expiresAt: new Date(Date.now() + this.SESSION_TTL * 1000),
state: 'RECOVERED',
recoveredAt: new Date(),
context: { entities: {} },
messages: messages.map((m: any) => ({
id: m.id, role: m.role, content: m.content, timestamp: new Date(m.timestamp)
})),
metadata: {},
isActive: true
};

await db.collection('sessions').insert({ ...recovered, id: sessionId });
await cache.setex(`session:${sessionId}`, this.SESSION_TTL, JSON.stringify(recovered));

console.log(`🔄 Session reconstructed from messages: ${sessionId}`);
return recovered;
}

async transferToHuman(sessionId: string, reason: string): Promise<void> {
const session = await this.getSession(sessionId);
if (!session) throw new Error(`Session not found: ${sessionId}`);

session.state = 'AWAITING_AGENT';
session.context.handoffToHuman = true;
session.context.handoffReason = reason;

await this.updateSession(sessionId, { state: session.state, context: session.context });
console.log(`👤 Session ${sessionId} transferred to human agent: ${reason}`);
}

async upgradeAnonymousSession(anonymousSessionId: string, userId: string): Promise<string> {
const db = await ConnectorFactory.getDatabase();
const cache = await ConnectorFactory.getCache();

const anonSession = await this.getSession(anonymousSessionId);
if (!anonSession) throw new Error(`Session not found: ${anonymousSessionId}`);

const authSessionId = uuidv4();
const authSession: Session = {
...anonSession,
sessionId: authSessionId,
userId,
previousSessionId: anonymousSessionId,
upgraded: true,
upgradedAt: new Date()
};

await cache.setex(`session:${authSessionId}`, this.SESSION_TTL, JSON.stringify(authSession));
await db.collection('sessions').insert({ ...authSession, id: authSessionId });
await this.closeSession(anonymousSessionId, 'upgraded_to_authenticated');
await db.collection('session_messages').updateMany(
{ session_id: anonymousSessionId },
{ $set: { user_id: userId } }
);

console.log(`⬆ Session upgraded: ${anonymousSessionId} → ${authSessionId}`);
return authSessionId;
}
}

export const sessionManager = new SessionManager();