/**
 * Access Database Connector
 * Conecta con base de datos MS Access usando node-adodb
 */

import ADODB from 'node-adodb';
import { IDataConnector, ICollection, IQuery, QueryFilter, UpdateOperation } from '../base/IDataConnector';

/**
 * Adaptador para consultas SQL directas (Access no usa colecciones MongoDB-like)
 */
class AccessQueryResult<T> implements IQuery<T> {
  constructor(private results: Array<T & { id: string }>) {}

  async toArray(): Promise<Array<T & { id: string }>> {
    return this.results;
  }

  sort(sortSpec: { [key: string]: 1 | -1 }): IQuery<T> {
    const sortedResults = [...this.results].sort((a, b) => {
      for (const [key, direction] of Object.entries(sortSpec)) {
        const aVal = (a as any)[key];
        const bVal = (b as any)[key];
        if (aVal < bVal) return direction === 1 ? -1 : 1;
        if (aVal > bVal) return direction === 1 ? 1 : -1;
      }
      return 0;
    });
    return new AccessQueryResult(sortedResults);
  }

  limit(n: number): IQuery<T> {
    return new AccessQueryResult(this.results.slice(0, n));
  }

  skip(n: number): IQuery<T> {
    return new AccessQueryResult(this.results.slice(n));
  }
}

/**
 * Adaptador para colecciones de Access (traduce operaciones a SQL)
 */
class AccessCollectionAdapter<T> implements ICollection<T> {
  constructor(
    private connector: AccessDatabaseConnector,
    private tableName: string
  ) {}

  async insert(document: T & { id?: string }): Promise<T & { id: string }> {
    throw new Error('INSERT operations not supported on Access DB (read-only)');
  }

  async findOne(filter: QueryFilter): Promise<(T & { id: string }) | null> {
    const query = await this.find(filter);
    const results = await query.limit(1).toArray();
    return results[0] || null;
  }

  async find(filter?: QueryFilter): Promise<IQuery<T>> {
    const whereClause = this.buildWhereClause(filter);
    const sql = `SELECT * FROM ${this.tableName}${whereClause ? ' WHERE ' + whereClause : ''}`;
    const results = await this.connector.executeQuery<T>(sql);
    return new AccessQueryResult(results as Array<T & { id: string }>);
  }

  async updateOne(
    filter: QueryFilter,
    update: UpdateOperation,
    options?: { upsert?: boolean }
  ): Promise<{ modifiedCount: number }> {
    throw new Error('UPDATE operations not supported on Access DB (read-only)');
  }

  async updateMany(
    filter: QueryFilter,
    update: UpdateOperation
  ): Promise<{ modifiedCount: number }> {
    throw new Error('UPDATE operations not supported on Access DB (read-only)');
  }

  async deleteOne(filter: QueryFilter): Promise<{ deletedCount: number }> {
    throw new Error('DELETE operations not supported on Access DB (read-only)');
  }

  async deleteMany(filter: QueryFilter): Promise<{ deletedCount: number }> {
    throw new Error('DELETE operations not supported on Access DB (read-only)');
  }

  async count(filter?: QueryFilter): Promise<number> {
    const whereClause = this.buildWhereClause(filter);
    const sql = `SELECT COUNT(*) as total FROM ${this.tableName}${whereClause ? ' WHERE ' + whereClause : ''}`;
    const results = await this.connector.executeQuery<{ total: number }>(sql);
    return results[0]?.total || 0;
  }

  async bulkWrite(operations: any[]): Promise<{ modifiedCount: number }> {
    throw new Error('BULK WRITE operations not supported on Access DB (read-only)');
  }

  /**
   * Construye cláusula WHERE básica desde filtros simples
   */
  private buildWhereClause(filter?: QueryFilter): string {
    if (!filter || Object.keys(filter).length === 0) {
      return '';
    }

    const conditions: string[] = [];
    for (const [key, value] of Object.entries(filter)) {
      if (typeof value === 'string') {
        conditions.push(`${key} = '${value.replace(/'/g, "''")}'`);
      } else if (typeof value === 'number') {
        conditions.push(`${key} = ${value}`);
      } else if (value === null) {
        conditions.push(`${key} IS NULL`);
      }
    }
    return conditions.join(' AND ');
  }
}

/**
 * Conector principal para Access Database
 */
export class AccessDatabaseConnector implements IDataConnector {
  private connection: any;
  private connected = false;
  private dbPath: string;

  constructor(dbPath?: string) {
    this.dbPath = dbPath || process.env.ACCESS_DB_PATH || 'c:\\Desarrollo\\LFSoft.chat\\chat.AI.database\\Utilidades.mdb';
  }

  async connect(): Promise<void> {
    try {
      // Configurar conexión con node-adodb
      this.connection = ADODB.open(`Provider=Microsoft.Jet.OLEDB.4.0;Data Source=${this.dbPath};`);
      this.connected = true;
      console.log(`[AccessDB] Connected to ${this.dbPath}`);
    } catch (error: any) {
      console.error('[AccessDB] Connection error:', error.message);
      throw new Error(`Failed to connect to Access DB: ${error.message}`);
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.connection = null;
    console.log('[AccessDB] Disconnected');
  }

  isConnected(): boolean {
    return this.connected;
  }

  collection<T = any>(name: string): ICollection<T> {
    if (!this.connected) {
      throw new Error('Not connected to Access DB');
    }
    return new AccessCollectionAdapter<T>(this, name);
  }

  async dropCollection(name: string): Promise<void> {
    throw new Error('DROP operations not supported on Access DB (read-only)');
  }

  /**
   * Ejecuta consulta SQL directa (método principal para Access)
   */
  async executeQuery<T = any>(sql: string): Promise<T[]> {
    if (!this.connected) {
      throw new Error('Not connected to Access DB');
    }

    try {
      console.log(`[AccessDB] Executing query: ${sql}`);
      const results = await this.connection.query(sql);
      console.log(`[AccessDB] Query returned ${results.length} rows`);
      return results as T[];
    } catch (error: any) {
      console.error('[AccessDB] Query error:', error.message);
      throw new Error(`Query failed: ${error.message}`);
    }
  }

  /**
   * Método helper para obtener la ruta de la base de datos
   */
  getDbPath(): string {
    return this.dbPath;
  }
}
