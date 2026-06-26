/**
* Message Worker
* Procesa mensajes de la cola
*/

import { messageQueue } from './MessageQueue';
import { messagePipeline } from '../pipeline/MessagePipeline';
import { QueuedMessage } from '../../models/types';

export class MessageWorker {
  private workerId: string;
  private concurrency: number;
  private running: boolean = false;
  private activeJobs: number = 0;
  private maxRetries: number = 3;

  constructor(workerId: string, concurrency: number = 5) {
    this.workerId = workerId;
    this.concurrency = concurrency;
  }

  async start(): Promise<void> {
    this.running = true;
    console.log(`Worker ${this.workerId} started with concurrency ${this.concurrency}`);

    for (let i = 0; i < this.concurrency; i++) {
      this.processLoop().catch(error => {
        console.error(`Worker ${this.workerId} loop ${i} crashed:`, error);
      });
    }
  }

  private async processLoop(): Promise<void> {
    while (this.running) {
      try {
        const queuedMessage = await messageQueue.dequeue(5000);

        if (!queuedMessage) continue;

        this.activeJobs++;
        await this.processMessage(queuedMessage);
        this.activeJobs--;
      } catch (error) {
        console.error(`Worker ${this.workerId} error:`, error);
        this.activeJobs--;
      }
    }
  }

  private async processMessage(queuedMessage: QueuedMessage): Promise<void> {
    const startTime = Date.now();

    try {
      console.log(`Processing message ${queuedMessage.id}`);
      await messagePipeline.process(queuedMessage.message);
      const duration = Date.now() - startTime;
      console.log(`Message ${queuedMessage.id} processed in ${duration}ms`);
    } catch (error) {
      console.error(`Failed to process message ${queuedMessage.id}:`, error);

      const shouldRetry = await this.shouldRetry(queuedMessage);

      if (shouldRetry) {
        await this.retry(queuedMessage);
      } else {
        await messageQueue.moveToDeadLetter(queuedMessage, error as Error);
      }

      throw error;
    }
  }

  private async shouldRetry(message: QueuedMessage): Promise<boolean> {
    const retryCount = message.retryCount || 0;
    return retryCount < this.maxRetries;
  }

  private async retry(message: QueuedMessage): Promise<void> {
    const retryCount = (message.retryCount || 0) + 1;
    const delay = Math.pow(2, retryCount) * 1000;

    console.log(`Retrying message ${message.id} in ${delay}ms (attempt ${retryCount})`);

    await messageQueue.retry(message, delay);
  }

  stop(): void {
    this.running = false;
    console.log(`Worker ${this.workerId} stopping...`);
  }

  getStatus(): {
    workerId: string;
    running: boolean;
    activeJobs: number;
    concurrency: number;
  } {
    return {
      workerId: this.workerId,
      running: this.running,
      activeJobs: this.activeJobs,
      concurrency: this.concurrency
    };
  }
}

export class WorkerPool {
  private workers: MessageWorker[] = [];

  constructor(private workerCount: number = 3, private concurrency: number = 3) {}

  async start(): Promise<void> {
    console.log(`Starting worker pool with ${this.workerCount} workers`);

    for (let i = 0; i < this.workerCount; i++) {
      const worker = new MessageWorker(`worker-${i}`, this.concurrency);
      this.workers.push(worker);
      worker.start().catch(error => {
        console.error(`Worker ${i} crashed:`, error);
      });
    }

    console.log('Worker pool started');
  }

  stopAll(): void {
    console.log('Stopping all workers...');
    this.workers.forEach(worker => worker.stop());
  }

  getStatus(): any[] {
    return this.workers.map(w => w.getStatus());
  }
}

export const workerPool = new WorkerPool(3, 3);
