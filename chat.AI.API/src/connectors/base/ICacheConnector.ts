export interface ICacheConnector {
connect(): Promise<void>;
disconnect(): Promise<void>;
isConnected(): boolean;

// String ops
get(key: string): Promise<any | null>;
set(key: string, value: any): Promise<boolean>;
setex(key: string, seconds: number, value: any): Promise<boolean>;
del(key: string): Promise<number>;
exists(key: string): Promise<boolean>;
expire(key: string, seconds: number): Promise<boolean>;
ttl(key: string): Promise<number>;

// Increment/Decrement
incr(key: string): Promise<number>;
decr(key: string): Promise<number>;
incrby(key: string, increment: number): Promise<number>;

// Set ops
sadd(key: string, ...members: string[]): Promise<number>;
smembers(key: string): Promise<string[]>;
srem(key: string, member: string): Promise<number>;
sismember(key: string, member: string): Promise<boolean>;

// Sorted set ops
zadd(key: string, score: number, value: string): Promise<number>;
zpopmin(key: string, count?: number): Promise<Array<[string, number]>>;
bzpopmin(key: string, timeout: number): Promise<[string, string, number] | null>;
zcard(key: string): Promise<number>;
zrange(key: string, start: number, stop: number): Promise<string[]>;

// Key ops
keys(pattern: string): Promise<string[]>;

// Pub/Sub
publish(channel: string, message: string): Promise<number>;
subscribe(channel: string, callback: (message: string) => void): Promise<void>;

// Utility
flushall(): Promise<void>;
dbsize(): Promise<number>;
}