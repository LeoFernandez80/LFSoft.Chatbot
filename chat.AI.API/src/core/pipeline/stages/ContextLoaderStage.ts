/**
* Stage 2: Context Loader
* Carga sesión, configuración de tenant, perfil de usuario
*/

import { PipelineStage } from './PreprocessorStage';
import { ProcessedMessage } from '../../../models/types';
import { sessionManager } from '../../session/SessionManager';
import { ConnectorFactory } from '../../../connectors';
import { v4 as uuidv4 } from 'uuid';

export class ContextLoaderStage implements PipelineStage {
name = 'context_loader';
critical = true;

async execute(context: ProcessedMessage): Promise<ProcessedMessage> {
const { sessionId, userId, tenantId } = context.originalMessage;
const db = await ConnectorFactory.getDatabase();
const cache = await ConnectorFactory.getCache();

const loadedSession = await sessionManager.getSession(sessionId);
if (!loadedSession) throw new Error('Session not found');

context.session = loadedSession;
context.session.lastActivityAt = new Date();

context.session.messages.push({
id: uuidv4(),
role: 'user' as const,
content: context.currentMessage.content,
timestamp: new Date()
});

context.tenantConfig = await this.loadTenantConfig(tenantId, db, cache);
context.userProfile = await this.loadUserProfile(userId, tenantId, db);
context.userMemory = await this.loadUserMemory(userId, tenantId, db);

return context;
}

private async loadTenantConfig(tenantId: string, db: any, cache: any): Promise<any> {
const cacheKey = `tenant_config:${tenantId}`;
let config = await cache.get(cacheKey);

    if (!config) {
      const configDoc = await db.collection('tenants').findOne({ tenantId });

      config = configDoc ?? {
        tenantId,
        name: 'Default Tenant',
        active: true,
        intents: ['saludo', 'despedida', 'consulta_precio', 'consulta_stock', 'realizar_compra', 'soporte']
      };

      await cache.setex(cacheKey, 3600, JSON.stringify(config));
    } else {
      config = JSON.parse(config);
    }

    return config;
}

private async loadUserProfile(userId: string, tenantId: string, db: any): Promise<any> {
const profile = await db.collection('users').findOne({ userId, tenantId });
return profile ?? { userId, tenantId, tier: 'regular' };
}

private async loadUserMemory(userId: string, tenantId: string, db: any): Promise<any> {
const queryResult = await db.collection('user_memories').find({ userId, tenantId });
const memories = await queryResult.toArray();

return memories.reduce((acc: any, m: any) => {
acc[m.key] = m.value;
return acc;
}, {});
}
}