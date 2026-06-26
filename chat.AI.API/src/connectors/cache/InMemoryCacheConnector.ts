import { ICacheConnector } from '../base/ICacheConnector';
import { RedisSimulator } from '../../simulations/cache/RedisSimulator';

export class InMemoryCacheConnector implements ICacheConnector {
private simulator = new RedisSimulator();
private connected = false;

async connect(): Promise<void> {
this.connected = true;
console.log('[InMemoryCache] Connected');
}

async disconnect(): Promise<void> {
this.simulator.destroy();
this.connected = false;
console.log('[InMemoryCache] Disconnected');
}

isConnected(): boolean { return this.connected; }

get(key: string) { return this.simulator.get(key); }
set(key: string, value: any) { return this.simulator.set(key, value); }
setex(key: string, seconds: number, value: any) { return this.simulator.setex(key, seconds, value); }
del(key: string) { return this.simulator.del(key); }
exists(key: string) { return this.simulator.exists(key); }
expire(key: string, seconds: number) { return this.simulator.expire(key, seconds); }
ttl(key: string) { return this.simulator.ttl(key); }
incr(key: string) { return this.simulator.incr(key); }
decr(key: string) { return this.simulator.decr(key); }
incrby(key: string, increment: number) { return this.simulator.incrby(key, increment); }
sadd(key: string, ...members: string[]) { return this.simulator.sadd(key, ...members); }
smembers(key: string) { return this.simulator.smembers(key); }
srem(key: string, member: string) { return this.simulator.srem(key, member); }
sismember(key: string, member: string) { return this.simulator.sismember(key, member); }
  zadd(key: string, score: number, value: string) { return this.simulator.zadd(key, score, value); }
  zpopmin(key: string, count?: number) { return this.simulator.zpopmin(key, count); }
  bzpopmin(key: string, timeout: number) { return this.simulator.bzpopmin(key, timeout); }
  zcard(key: string) { return this.simulator.zcard(key); }
  zrange(key: string, start: number, stop: number) { return this.simulator.zrange(key, start, stop); }
  keys(pattern: string) { return this.simulator.keys(pattern); }
  publish(channel: string, message: string) { return this.simulator.publish(channel, message); }
  subscribe(channel: string, callback: (message: string) => void) { return this.simulator.subscribe(channel, callback); }
  flushall() { return this.simulator.flushall(); }
  dbsize() { return this.simulator.dbsize(); }
}