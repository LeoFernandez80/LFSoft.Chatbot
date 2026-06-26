import { IDataConnector } from './base/IDataConnector';
import { ICacheConnector } from './base/ICacheConnector';
import { IRestApiConnector } from './base/IRestApiConnector';
import { IGraphQLConnector } from './base/IGraphQLConnector';
import { InMemoryDatabaseConnector } from './database/InMemoryDatabaseConnector';
import { AccessDatabaseConnector } from './database/AccessDatabaseConnector';
import { InMemoryCacheConnector } from './cache/InMemoryCacheConnector';
import { RestApiSimulator } from './rest/RestApiSimulator';
import { GraphQLSimulator } from '../simulations/graphql/GraphQLSimulator';

export type DatabaseType = 'in-memory' | 'access';
export type CacheType = 'in-memory' | 'redis';
export type RestApiType = 'simulator';
export type GraphQLType = 'simulator';

let dbInstance: IDataConnector | null = null;
let cacheInstance: ICacheConnector | null = null;
let accessDbInstance: AccessDatabaseConnector | null = null;
let accessCriteriosDbInstance: AccessDatabaseConnector | null = null;

export const ConnectorFactory = {
    async createDatabase(
        type: DatabaseType = (process.env.DATABASE_TYPE as DatabaseType) ?? 'in-memory',
        options: { connectionString?: string; dbName?: string } = {}
    ): Promise<IDataConnector> {
        switch (type) {
            default: {
                const connector = new InMemoryDatabaseConnector();
                await connector.connect();
                return connector;
            }
        }
    },

    async createCache(
        type: CacheType = (process.env.CACHE_TYPE as CacheType) ?? 'in-memory',
        options: { connectionString?: string } = {}
    ): Promise<ICacheConnector> {
        switch (type) {
            default: {
                const connector = new InMemoryCacheConnector();
                await connector.connect();
                return connector;
            }
        }
    },

    async getDatabase(): Promise<IDataConnector> {
        if (!dbInstance) {
            dbInstance = await this.createDatabase();
        }
        return dbInstance;
    },

    async getCache(): Promise<ICacheConnector> {
        if (!cacheInstance) {
            cacheInstance = await this.createCache();
        }
        return cacheInstance;
    },

    async createRestApi(
        type: RestApiType = (process.env.REST_API_TYPE as RestApiType) ?? 'simulator',
        options: { baseUrl?: string } = {}
    ): Promise<IRestApiConnector> {
        const baseUrl = options.baseUrl ?? process.env.REST_API_BASE_URL;
        const connector = new RestApiSimulator(baseUrl);
        await connector.connect();
        return connector;
    },

    async createGraphQL(
        type: GraphQLType = (process.env.GRAPHQL_TYPE as GraphQLType) ?? 'simulator',
        options: { endpoint?: string } = {}
    ): Promise<IGraphQLConnector> {
        const endpoint = options.endpoint ?? process.env.GRAPHQL_ENDPOINT;
        const connector = new GraphQLSimulator(endpoint);
        await connector.connect();
        return connector;
    },

    async getAccessUtilitiesDatabase(): Promise<AccessDatabaseConnector> {
        if (!accessDbInstance) {
            const dbPath = process.env.ACCESS_DB_PATH || 'c:\\Desarrollo\\LFSoft.chat\\chat.AI.database\\Utilidades.mdb';
            accessDbInstance = new AccessDatabaseConnector(dbPath);
            await accessDbInstance.connect();
        }
        return accessDbInstance;
    },

    async getAccessCriteriosDatabase(): Promise<AccessDatabaseConnector> {
        if (!accessCriteriosDbInstance) {
            const dbPath = process.env.ACCESS_CRITERIOS_DB_PATH || 'c:\\Desarrollo\\LFSoft.chat\\chat.AI.database\\Criterios.mdb';
            accessCriteriosDbInstance = new AccessDatabaseConnector(dbPath);
            await accessCriteriosDbInstance.connect();
        }
        return accessCriteriosDbInstance;
    },

        async getAccessArticulosDatabase(): Promise<AccessDatabaseConnector> {
        if (!accessCriteriosDbInstance) {
            const dbPath = process.env.ACCESS_CRITERIOS_DB_PATH || 'c:\\Desarrollo\\LFSoft.chat\\chat.AI.database\\articulo.mdb';
            accessCriteriosDbInstance = new AccessDatabaseConnector(dbPath);
            await accessCriteriosDbInstance.connect();
        }
        return accessCriteriosDbInstance;
    },

    async disconnectAll(): Promise<void> {
        if (dbInstance) { await dbInstance.disconnect(); dbInstance = null; }
        if (cacheInstance) { await cacheInstance.disconnect(); cacheInstance = null; }
        if (accessDbInstance) { await accessDbInstance.disconnect(); accessDbInstance = null; }
        if (accessCriteriosDbInstance) { await accessCriteriosDbInstance.disconnect(); accessCriteriosDbInstance = null; }
    }
};
