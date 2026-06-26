/**
* Simulación de Base de Datos en memoria
* Implementa operaciones CRUD similares a MongoDB/PostgreSQL
*/

import { v4 as uuidv4 } from 'uuid';

export interface QueryFilter {
[key: string]: any;
}

export interface UpdateOperation {
$set?: { [key: string]: any };
$push?: { [key: string]: any };
$inc?: { [key: string]: number };
}

export class Collection<T = any> {
private documents: Map<string, T> = new Map();
private indexes: Map<string, Map<any, Set<string>>> = new Map();

constructor(private collectionName: string) {}

async insert(document: T & { id?: string }): Promise<T & { id: string }> {
const id = document.id || uuidv4();
const doc = { ...document, id } as T & { id: string };
this.documents.set(id, doc as T);
this.updateIndexes(id, doc);
return doc;
}

async insertMany(documents: T[]): Promise<Array<T & { id: string }>> {
const results = [];
for (const doc of documents) {
results.push(await this.insert(doc as T & { id?: string }));
}
return results;
}

async findOne(filter: QueryFilter): Promise<(T & { id: string }) | null> {
for (const [id, doc] of this.documents) {
if (this.matchesFilter(doc, filter)) {
return { ...doc, id } as T & { id: string };
}
}
return null;
}

async find(filter: QueryFilter = {}): Promise<Query<T>> {
const matchingDocs: Array<T & { id: string }> = [];

for (const [id, doc] of this.documents) {
if (this.matchesFilter(doc, filter)) {
matchingDocs.push({ ...doc, id } as T & { id: string });
}
}
return new Query(matchingDocs);
}

async updateOne(
filter: QueryFilter,
update: UpdateOperation,
options: { upsert?: boolean } = {}
): Promise<{ modifiedCount: number }> {
for (const [id, doc] of this.documents) {
if (this.matchesFilter(doc, filter)) {
const updatedDoc = this.applyUpdate(doc, update);
this.documents.set(id, updatedDoc);
this.updateIndexes(id, updatedDoc);
return { modifiedCount: 1 };
}
}

if (options.upsert) {
const newDoc = this.applyUpdate({} as T, update);
await this.insert(newDoc as T & { id?: string });
return { modifiedCount: 1 };
}

return { modifiedCount: 0 };
}

async updateMany(
filter: QueryFilter,
update: UpdateOperation
): Promise<{ modifiedCount: number }> {
let modifiedCount = 0;

for (const [id, doc] of this.documents) {
if (this.matchesFilter(doc, filter)) {
const updatedDoc = this.applyUpdate(doc, update);
this.documents.set(id, updatedDoc);
this.updateIndexes(id, updatedDoc);
modifiedCount++;
}
}

return { modifiedCount };
}

async deleteOne(filter: QueryFilter): Promise<{ deletedCount: number }> {
for (const [id, doc] of this.documents) {
if (this.matchesFilter(doc, filter)) {
this.documents.delete(id);
return { deletedCount: 1 };
}
}
return { deletedCount: 0 };
}

async deleteMany(filter: QueryFilter): Promise<{ deletedCount: number }> {
let deletedCount = 0;
const idsToDelete: string[] = [];

for (const [id, doc] of this.documents) {
if (this.matchesFilter(doc, filter)) {
idsToDelete.push(id);
}
}

idsToDelete.forEach(id => {
this.documents.delete(id);
deletedCount++;
});

return { deletedCount };
}

async count(filter: QueryFilter = {}): Promise<number> {
let count = 0;
for (const [_, doc] of this.documents) {
if (this.matchesFilter(doc, filter)) {
count++;
}
}
return count;
}

async bulkWrite(operations: any[]): Promise<{ modifiedCount: number }> {
let modifiedCount = 0;
for (const op of operations) {
if (op.updateOne) {
const result = await this.updateOne(op.updateOne.filter, op.updateOne.update, {
upsert: op.updateOne.upsert
});
modifiedCount += result.modifiedCount;
}
}
return { modifiedCount };
}

createIndex(field: string): void {
if (!this.indexes.has(field)) {
this.indexes.set(field, new Map());
}
}

private matchesFilter(doc: any, filter: QueryFilter): boolean {
for (const [key, value] of Object.entries(filter)) {
if (key.startsWith('$')) {
// Operadores especiales
if (key === '$or') {
const orConditions = value as QueryFilter[];
const matches = orConditions.some(condition => this.matchesFilter(doc, condition));
if (!matches) return false;
} else if (key === '$and') {
const andConditions = value as QueryFilter[];
const matches = andConditions.every(condition => this.matchesFilter(doc, condition));
if (!matches) return false;
}
} else {
const docValue = this.getNestedValue(doc, key);

if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
// Operadores de comparación
for (const [op, opValue] of Object.entries(value)) {
if (op === '$lt' && !(docValue < (opValue as any))) return false;
if (op === '$lte' && !(docValue <= (opValue as any))) return false;
if (op === '$gt' && !(docValue > (opValue as any))) return false;
if (op === '$gte' && !(docValue >= (opValue as any))) return false;
if (op === '$ne' && docValue === opValue) return false;
if (op === '$in' && !(opValue as any[]).includes(docValue)) return false;
if (op === '$nin' && (opValue as any[]).includes(docValue)) return false;
}
} else {
// Comparación directa
if (docValue !== value) return false;
}
}
}
return true;
}

private applyUpdate(doc: T, update: UpdateOperation): T {
const result: any = { ...doc };

if (update.$set) {
Object.assign(result, update.$set);
}

if (update.$push) {
for (const [key, value] of Object.entries(update.$push)) {
const arr = (result as any)[key] || [];
(result as any)[key] = [...arr, value];
}
}

if (update.$inc) {
for (const [key, value] of Object.entries(update.$inc)) {
(result as any)[key] = ((result as any)[key] || 0) + value;
}
}

return result;
}

private getNestedValue(obj: any, path: string): any {
return path.split('.').reduce((current, key) => current?.[key], obj);
}

private updateIndexes(id: string, doc: any): void {
this.indexes.forEach((indexMap, field) => {
const value = this.getNestedValue(doc, field);
if (value !== undefined) {
if (!indexMap.has(value)) {
indexMap.set(value, new Set());
}
indexMap.get(value)!.add(id);
}
});
}

clear(): void {
this.documents.clear();
this.indexes.clear();
}
}

export class Query<T> {
constructor(private documents: Array<T & { id: string }>) {}

async toArray(): Promise<Array<T & { id: string }>> {
return this.documents;
}

sort(sortSpec: { [key: string]: 1 | -1 }): Query<T> {
const [field, direction] = Object.entries(sortSpec)[0];
this.documents.sort((a, b) => {
const aVal = (a as any)[field];
const bVal = (b as any)[field];
if (aVal < bVal) return direction === 1 ? -1 : 1;
if (aVal > bVal) return direction === 1 ? 1 : -1;
return 0;
});
return this;
}

limit(n: number): Query<T> {
this.documents = this.documents.slice(0, n);
return this;
}

skip(n: number): Query<T> {
this.documents = this.documents.slice(n);
return this;
}
}

export class DatabaseSimulator {
private collections: Map<string, Collection> = new Map();

collection<T = any>(name: string): Collection<T> {
if (!this.collections.has(name)) {
this.collections.set(name, new Collection(name));
}
return this.collections.get(name)! as Collection<T>;
}

async dropCollection(name: string): Promise<void> {
this.collections.delete(name);
}

async listCollections(): Promise<string[]> {
return Array.from(this.collections.keys());
}

async dropDatabase(): Promise<void> {
this.collections.clear();
}
}

// Singleton instance
export const db = new DatabaseSimulator();