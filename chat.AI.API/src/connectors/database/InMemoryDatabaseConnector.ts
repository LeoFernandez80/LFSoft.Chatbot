import { IDataConnector, ICollection, IQuery, QueryFilter, UpdateOperation } from '../base/IDataConnector';
import { DatabaseSimulator, Collection, Query } from '../../simulations/database/DatabaseSimulator';

class QueryAdapter<T> implements IQuery<T> {
constructor(private query: Query<T>) {}

toArray(): Promise<Array<T & { id: string }>> {
return this.query.toArray();
}

sort(sortSpec: { [key: string]: 1 | -1 }): IQuery<T> {
return new QueryAdapter(this.query.sort(sortSpec));
}

limit(n: number): IQuery<T> {
return new QueryAdapter(this.query.limit(n));
}

skip(n: number): IQuery<T> {
return new QueryAdapter(this.query.skip(n));
}
}

class CollectionAdapter<T> implements ICollection<T> {
constructor(private col: Collection<T>) {}

insert(document: T & { id?: string }): Promise<T & { id: string }> {
return this.col.insert(document);
}

findOne(filter: QueryFilter): Promise<(T & { id: string }) | null> {
return this.col.findOne(filter);
}

async find(filter: QueryFilter = {}): Promise<IQuery<T>> {
const query = await this.col.find(filter);
return new QueryAdapter(query);
}

updateOne(
filter: QueryFilter,
update: UpdateOperation,
options?: { upsert?: boolean }
): Promise<{ modifiedCount: number }> {
return this.col.updateOne(filter, update, options);
}

updateMany(filter: QueryFilter, update: UpdateOperation): Promise<{ modifiedCount: number }> {
return this.col.updateMany(filter, update);
}

deleteOne(filter: QueryFilter): Promise<{ deletedCount: number }> {
return this.col.deleteOne(filter);
}

deleteMany(filter: QueryFilter): Promise<{ deletedCount: number }> {
return this.col.deleteMany(filter);
}

count(filter: QueryFilter = {}): Promise<number> {
return this.col.count(filter);
}

bulkWrite(operations: any[]): Promise<{ modifiedCount: number }> {
return this.col.bulkWrite(operations);
}
}

export class InMemoryDatabaseConnector implements IDataConnector {
private simulator = new DatabaseSimulator();
private connected = false;

async connect(): Promise<void> {
this.connected = true;
console.log('[InMemoryDB] Connected');
}

async disconnect(): Promise<void> {
await this.simulator.dropDatabase();
this.connected = false;
console.log('[InMemoryDB] Disconnected');
}

isConnected(): boolean {
return this.connected;
}

collection<T = any>(name: string): ICollection<T> {
return new CollectionAdapter<T>(this.simulator.collection<T>(name));
}

dropCollection(name: string): Promise<void> {
return this.simulator.dropCollection(name);
}
}