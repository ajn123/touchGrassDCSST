import { SendMessageBatchCommand, SQSClient } from "@aws-sdk/client-sqs";
import { Resource } from "sst";

// Batch configuration
const BATCH_SIZE = 10; // SQS max batch size
const FLUSH_INTERVAL = 30000; // 30 seconds

class QueueBatcher {
  private messages: Array<{ id: string; body: any }> = [];
  private timer: NodeJS.Timeout | null = null;
  private sqs: SQSClient;

  constructor() {
    this.sqs = new SQSClient({});
  }

  addMessage(body: any) {
    const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.messages.push({ id, body });

    console.log(`Message queued. Queue size: ${this.messages.length}`);

    // Send batch if we've reached the batch size
    if (this.messages.length >= BATCH_SIZE) {
      this.flush();
    } else if (!this.timer) {
      // Set timer to flush after interval
      this.timer = setTimeout(() => this.flush(), FLUSH_INTERVAL);
    }
  }

  async flush() {
    if (this.messages.length === 0) return;

    // Clear the timer
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    // Take all current messages
    const batch = this.messages.splice(0);

    try {
      console.log(`Sending batch of ${batch.length} messages to SQS`);

      const entries = batch.map((msg, index) => ({
        Id: msg.id,
        MessageBody: JSON.stringify(msg.body),
      }));

      await this.sqs.send(
        new SendMessageBatchCommand({
          QueueUrl: Resource.user_analytics.url,
          Entries: entries,
        })
      );

      console.log(`Successfully sent batch of ${batch.length} messages`);
    } catch (error) {
      console.error("Failed to send batch to queue:", error);

      // Put messages back in queue for retry (but limit to prevent memory issues)
      if (this.messages.length < 50) {
        this.messages.unshift(...batch);
      }
    }
  }

  // Force flush for cleanup
  async forceFlush() {
    await this.flush();
    this.sqs.destroy();
  }

  getQueueSize() {
    return this.messages.length;
  }
}

// Create singleton instance
let batcherInstance: QueueBatcher | null = null;

function getBatcher(): QueueBatcher {
  if (!batcherInstance) {
    batcherInstance = new QueueBatcher();
  }
  return batcherInstance;
}

// Export the batched function
export async function sendToQueue(body: any) {
  getBatcher().addMessage(body);
}

// Export utilities for debugging
export function getQueueSize() {
  return getBatcher().getQueueSize();
}

export async function flushQueue() {
  return getBatcher().flush();
}

// Cleanup function for graceful shutdown
export async function cleanupQueue() {
  if (batcherInstance) {
    await batcherInstance.forceFlush();
    batcherInstance = null;
  }
}
