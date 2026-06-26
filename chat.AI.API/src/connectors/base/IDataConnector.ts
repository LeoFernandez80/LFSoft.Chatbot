export interface QueryFilter {
[key: string]: any;
}

export interface UpdateOperation {
$set?: { [key: string]: any };
$push?: { [key: string]: any };
$inc?: { [key: string]: number };
}

export interface IQuery<T> {
toArray(): Promise<Array<T & { id: string }>>;
sort(sortSpec: { [key: string]: 1 | -1 }): IQuery<T>;
limit(n: number): IQuery<T>;
skip(n: number): IQuery<T>;
}

export interface ICollection<T = any> {
insert(document: T & { id?: string }): Promise<T & { id: string }>;
findOne(filter: QueryFilter): Promise<(T & { id: string }) | null>;
find(filter?: QueryFilter): Promise<IQuery<T>>;
updateOne(
filter: QueryFilter,
update: UpdateOperation,
options?: { upsert?: boolean }
): Promise<{ modifiedCount: number }>;
updateMany(
filter: QueryFilter,
update: UpdateOperation
): Promise<{ modifiedCount: number }>;
deleteOne(filter: QueryFilter): Promise<{ deletedCount: number }>;
deleteMany(filter: QueryFilter): Promise<{ deletedCount: number }>;
count(filter?: QueryFilter): Promise<number>;
bulkWrite(operations: any[]): Promise<{ modifiedCount: number }>;
}

export interface IDataConnector {
connect(): Promise<void>;
disconnect(): Promise<void>;
isConnected(): boolean;
collection<T = any>(name: string): ICollection<T>;
dropCollection(name: string): Promise<void>;
}