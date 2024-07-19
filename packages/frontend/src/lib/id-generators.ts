import { randomUUID } from 'crypto';

// 1. UUID/GUID (Recommended for most cases)
export function generateUUID(): string {
  return randomUUID();
}

// 2. Timestamp-based ID (Good for time-ordered data)
export function generateTimestampId(): string {
  return Date.now().toString();
}

// 3. Composite ID (Good for related data)
export function generateCompositeId(prefix: string, suffix?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}${suffix ? `-${suffix}` : ''}`;
}

// 4. Nano ID (Alternative to UUID, shorter)
export function generateNanoId(length: number = 21): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 5. Sequential ID with prefix (Good for human-readable IDs)
export function generateSequentialId(prefix: string, counter: number): string {
  return `${prefix}-${counter.toString().padStart(6, '0')}`;
}

// 6. Hash-based ID (Good for deterministic IDs)
export function generateHashId(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

// 7. ULID (Universally Unique Lexicographically Sortable Identifier)
export function generateULID(): string {
  const timestamp = Date.now();
  const randomness = Math.random().toString(36).substring(2, 15);
  return timestamp.toString(36) + randomness;
} 