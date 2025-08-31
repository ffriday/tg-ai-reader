import crypto from 'crypto';

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

export class MemoryCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private defaultTtl: number;

  constructor(defaultTtl: number = 3600000) { // 1 hour default
    this.defaultTtl = defaultTtl;
  }

  private generateKey(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex');
  }

  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  public set(key: string, value: T, ttl?: number): void {
    const hashedKey = this.generateKey(key);
    this.cache.set(hashedKey, {
      value,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTtl,
    });
  }

  public get(key: string): T | null {
    const hashedKey = this.generateKey(key);
    const entry = this.cache.get(hashedKey);
    
    if (!entry) {
      return null;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(hashedKey);
      return null;
    }

    return entry.value;
  }

  public has(key: string): boolean {
    return this.get(key) !== null;
  }

  public delete(key: string): boolean {
    const hashedKey = this.generateKey(key);
    return this.cache.delete(hashedKey);
  }

  public clear(): void {
    this.cache.clear();
  }

  public size(): number {
    // Clean expired entries first
    this.cleanupExpired();
    return this.cache.size;
  }

  public cleanupExpired(): void {
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
      }
    }
  }
}