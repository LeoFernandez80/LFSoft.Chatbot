/**
* Simulación de Redis en memoria
* Implementa las operaciones principales de Redis sin necesidad de servidor externo
*/

export class RedisSimulator {
private store: Map<string, any> = new Map();
private expiry: Map<string, number> = new Map();
private sets: Map<string, Set<string>> = new Map();
private sortedSets: Map<string, Array<{ value: string; score: number }>> = new Map();
private cleanupInterval: NodeJS.Timeout;

constructor() {
// Limpiar claves expiradas cada 1 segundo
this.cleanupInterval = setInterval(() => this.cleanupExpired(), 1000);
}

// ==================== STRING OPERATIONS ====================

async set(key: string, value: any): Promise<boolean> {
this.store.set(key, value);
return true;
}

async get(key: string): Promise<any | null> {
if (this.isExpired(key)) {
this.del(key);
return null;
}
return this.store.get(key) || null;
}

async setex(key: string, seconds: number, value: any): Promise<boolean> {
this.store.set(key, value);
this.expiry.set(key, Date.now() + seconds * 1000);
return true;
}

async del(key: string): Promise<number> {
const existed = this.store.has(key);
this.store.delete(key);
this.expiry.delete(key);
return existed ? 1 : 0;
}

async exists(key: string): Promise<boolean> {
if (this.isExpired(key)) {
this.del(key);
return false;
}
return this.store.has(key);
}

async expire(key: string, seconds: number): Promise<boolean> {
if (!this.store.has(key)) return false;
this.expiry.set(key, Date.now() + seconds * 1000);
return true;
}

async ttl(key: string): Promise<number> {
if (!this.store.has(key)) return -2;
const expiryTime = this.expiry.get(key);
if (!expiryTime) return -1;
const remaining = Math.floor((expiryTime - Date.now()) / 1000);
return remaining > 0 ? remaining : -2;
}

// ==================== INCREMENT/DECREMENT ====================

async incr(key: string): Promise<number> {
const current = (await this.get(key)) || 0;
const newValue = parseInt(current) + 1;
await this.set(key, newValue);
return newValue;
}

async decr(key: string): Promise<number> {
const current = (await this.get(key)) || 0;
const newValue = parseInt(current) - 1;
await this.set(key, newValue);
return newValue;
}

async incrby(key: string, increment: number): Promise<number> {
const current = (await this.get(key)) || 0;
const newValue = parseInt(current) + increment;
await this.set(key, newValue);
return newValue;
}

// ==================== SET OPERATIONS ====================

async sadd(key: string, ...members: string[]): Promise<number> {
if (!this.sets.has(key)) {
this.sets.set(key, new Set());
}
const set = this.sets.get(key)!;
let added = 0;
members.forEach(member => {
if (!set.has(member)) {
set.add(member);
added++;
}
});
return added;
}

async smembers(key: string): Promise<string[]> {
const set = this.sets.get(key);
return set ? Array.from(set) : [];
}

async srem(key: string, member: string): Promise<number> {
const set = this.sets.get(key);
if (!set) return 0;
return set.delete(member) ? 1 : 0;
}

async sismember(key: string, member: string): Promise<boolean> {
const set = this.sets.get(key);
return set ? set.has(member) : false;
}

// ==================== SORTED SET OPERATIONS ====================

async zadd(key: string, score: number, value: string): Promise<number> {
if (!this.sortedSets.has(key)) {
this.sortedSets.set(key, []);
}
const sortedSet = this.sortedSets.get(key)!;

// Remover si ya existe
const existingIndex = sortedSet.findIndex(item => item.value === value);
if (existingIndex !== -1) {
sortedSet.splice(existingIndex, 1);
}

// Agregar y ordenar
sortedSet.push({ value, score });
sortedSet.sort((a, b) => a.score - b.score);

return existingIndex === -1 ? 1 : 0;
}

async zpopmin(key: string, count: number = 1): Promise<Array<[string, number]>> {
const sortedSet = this.sortedSets.get(key);
if (!sortedSet || sortedSet.length === 0) return [];

const result: Array<[string, number]> = [];
for (let i = 0; i < count && sortedSet.length > 0; i++) {
const item = sortedSet.shift()!;
result.push([item.value, item.score]);
}

return result;
}

async bzpopmin(key: string, timeout: number): Promise<[string, string, number] | null> {
// Simulación de blocking pop con timeout
const startTime = Date.now();
const timeoutMs = timeout * 1000;

while (Date.now() - startTime < timeoutMs) {
const sortedSet = this.sortedSets.get(key);
if (sortedSet && sortedSet.length > 0) {
const item = sortedSet.shift()!;
return [key, item.value, item.score];
}

// Wait a bit before checking again (simulate blocking)
await new Promise(resolve => setTimeout(resolve, 100));
}

return null;
}
async zcard(key: string): Promise<number> {
const sortedSet = this.sortedSets.get(key);
return sortedSet ? sortedSet.length : 0;
}

async zrange(key: string, start: number, stop: number): Promise<string[]> {
const sortedSet = this.sortedSets.get(key);
if (!sortedSet) return [];

const end = stop === -1 ? sortedSet.length : stop + 1;
return sortedSet.slice(start, end).map(item => item.value);
}

// ==================== KEY OPERATIONS ====================

async keys(pattern: string): Promise<string[]> {
const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
const matchingKeys: string[] = [];

this.store.forEach((value, key) => {
if (regex.test(key) && !this.isExpired(key)) {
matchingKeys.push(key);
}
});

return matchingKeys;
}

// ==================== PUBLISH/SUBSCRIBE ====================

private subscribers: Map<string, Array<(message: string) => void>> = new Map();

async publish(channel: string, message: string): Promise<number> {
const channelSubscribers = this.subscribers.get(channel) || [];
channelSubscribers.forEach(callback => callback(message));
return channelSubscribers.length;
}

async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
if (!this.subscribers.has(channel)) {
this.subscribers.set(channel, []);
}
this.subscribers.get(channel)!.push(callback);
}

// ==================== UTILITY METHODS ====================

private isExpired(key: string): boolean {
const expiryTime = this.expiry.get(key);
if (!expiryTime) return false;
return Date.now() >= expiryTime;
}

private cleanupExpired(): void {
const now = Date.now();
this.expiry.forEach((expiryTime, key) => {
if (now >= expiryTime) {
this.del(key);
}
});
}

async flushall(): Promise<void> {
this.store.clear();
this.expiry.clear();
this.sets.clear();
this.sortedSets.clear();
}

async dbsize(): Promise<number> {
return this.store.size;
}

destroy(): void {
clearInterval(this.cleanupInterval);
this.flushall();
}
}

// Singleton instance
export const redis = new RedisSimulator();