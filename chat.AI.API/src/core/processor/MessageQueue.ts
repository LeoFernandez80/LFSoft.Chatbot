import { v4 as uuidv4 } from 'uuid';
import { QueuedMessage, IncomingMessage } from '../../models/types';
import { ConnectorFactory } from '../../connectors';

export type Priority = 'high' | 'normal' | 'low';

export class MessageQueue {
  private readonly queues = {
    high: 'queue:messages:high',
    normal: 'queue:messages:normal',
    low: 'queue:messages:low'
  };

  private readonly DLQ_KEY = 'queue:messages:dead_letter';

  async enqueue(message: IncomingMessage, priority: Priority = 'normal'): Promise<string> {
    const cache = await ConnectorFactory.getCache();
    const queueKey = this.queues[priority];
    const messageId = uuidv4();

    const queuedMessage: QueuedMessage = {
      id: messageId,
      sessionId: message.sessionId,
      userId: message.userId,
      tenantId: message.tenantId,
      message,
      priority,
      enqueuedAt: Date.now()
    };

    const payload = JSON.stringify(queuedMessage);
    await cache.zadd(queueKey, Date.now(), payload);
    await cache.publish('message_queued', payload);

    console.log(`Message enqueued [${priority}]: ${messageId}`);
    return messageId;
  }

  async dequeue(timeout: number = 5000): Promise<QueuedMessage | null> {
    const cache = await ConnectorFactory.getCache();

    for (const priority of ['high', 'normal', 'low'] as Priority[]) {
      const result = await cache.bzpopmin(this.queues[priority], timeout / 1000);
      if (result) {
        const [, payload] = result;
        const queuedMessage = JSON.parse(payload) as QueuedMessage;
        console.log(`Message dequeued [${priority}]: ${queuedMessage.id}`);
        return queuedMessage;
      }
    }

    return null;
  }

  async dequeueMultiple(maxMessages: number = 10): Promise<QueuedMessage[]> {
    const cache = await ConnectorFactory.getCache();
    const messages: QueuedMessage[] = [];

    for (const priority of ['high', 'normal', 'low'] as Priority[]) {
      const remaining = maxMessages - messages.length;
      if (remaining <= 0) break;

      const results = await cache.zpopmin(this.queues[priority], remaining);
      results.forEach(([payload]: [string, number]) => messages.push(JSON.parse(payload)));
    }

    console.log(`Dequeued ${messages.length} messages`);
    return messages;
  }

  async getQueueLength(priority?: Priority): Promise<number> {
    const cache = await ConnectorFactory.getCache();

    if (priority) return cache.zcard(this.queues[priority]);

    let total = 0;
    for (const queueKey of Object.values(this.queues)) {
      total += await cache.zcard(queueKey);
    }
    return total;
  }

  async peek(priority: Priority = 'normal'): Promise<QueuedMessage | null> {
    const cache = await ConnectorFactory.getCache();
    const results = await cache.zrange(this.queues[priority], 0, 0);
    return results.length > 0 ? JSON.parse(results[0]) : null;
  }

  async moveToDeadLetter(message: QueuedMessage, error: Error): Promise<void> {
    const db = await ConnectorFactory.getDatabase();
    const cache = await ConnectorFactory.getCache();

    const dlqMessage = { ...message, failedAt: new Date(), error: error.message, stack: error.stack };

    await cache.zadd(this.DLQ_KEY, Date.now(), JSON.stringify(dlqMessage));
    await db.collection('dead_letter_messages').insert(dlqMessage);

    console.error(`Message moved to DLQ: ${message.id} - ${error.message}`);

    const dlqSize = await cache.zcard(this.DLQ_KEY);
    if (dlqSize > 100) console.error(`Dead Letter Queue size is high: ${dlqSize}`);
  }

  async retry(message: QueuedMessage, delayMs: number = 1000): Promise<void> {
    const cache = await ConnectorFactory.getCache();
    const retryCount = (message.retryCount || 0) + 1;

    await cache.zadd('queue:messages:retry', Date.now() + delayMs, JSON.stringify({ ...message, retryCount }));
    console.log(`Message retry scheduled: ${message.id} (attempt ${retryCount})`);
  }

  async processRetries(): Promise<void> {
    const cache = await ConnectorFactory.getCache();
    const now = Date.now();
    const retryKey = 'queue:messages:retry';
    const messages = await cache.zrange(retryKey, 0, -1);
    for (const payload of messages) {
      const message = JSON.parse(payload) as QueuedMessage;
      if (message.enqueuedAt <= now) {
        await this.enqueue(message.message, message.priority);
        await cache.zpopmin(retryKey, 1);
      }
    }
  }

  async clear(priority?: Priority): Promise<void> {
    const cache = await ConnectorFactory.getCache();

    if (priority) {
      await cache.del(this.queues[priority]);
    } else {
      for (const queueKey of Object.values(this.queues)) {
        await cache.del(queueKey);
      }
    }
    console.log(`Queue cleared: ${priority || 'all'}`);
  }

  async getStats(): Promise<{ high: number; normal: number; low: number; total: number; deadLetter: number }> {
    const cache = await ConnectorFactory.getCache();

    const [high, normal, low, deadLetter] = await Promise.all([
      cache.zcard(this.queues.high),
      cache.zcard(this.queues.normal),
      cache.zcard(this.queues.low),
      cache.zcard(this.DLQ_KEY)
    ]);

    return { high, normal, low, total: high + normal + low, deadLetter };
  }
}

export const messageQueue = new MessageQueue();
