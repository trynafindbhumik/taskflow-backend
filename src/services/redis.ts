import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL;
const REDIS_HOST = process.env.REDIS_HOST;
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);

let redisConnected = false;

const redisOptions = {
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
  retryStrategy(times: number) {
    // Stop retrying after 3 failed attempts to avoid endless ECONNREFUSED log spam
    if (times > 3) {
      return null;
    }
    return Math.min(times * 300, 1000);
  },
};

/**
 * Configured IORedis client instance with controlled retry limits.
 */
export const redis = REDIS_URL
  ? new Redis(REDIS_URL, redisOptions)
  : new Redis({
      host: REDIS_HOST || '127.0.0.1',
      port: REDIS_PORT,
      ...redisOptions,
    });

redis.on('connect', () => {
  redisConnected = true;
  console.log('⚡ Connected to Redis / Valkey Server');
});

redis.on('error', (err) => {
  if (redisConnected) {
    console.warn('⚠️ Redis Error (falling back to memory):', err.message);
  }
  redisConnected = false;
});

// In-Memory Fallback Cache Store
const memoryStore = new Map<string, { value: string; expiresAt: number }>();

function setInMemory(key: string, value: string, ttlSeconds: number) {
  memoryStore.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

function getFromMemory(key: string): string | null {
  const item = memoryStore.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    memoryStore.delete(key);
    return null;
  }
  return item.value;
}

function deleteFromMemory(key: string) {
  memoryStore.delete(key);
}

function getMemoryTtl(key: string): number {
  const item = memoryStore.get(key);
  if (!item) return 0;
  const remainingMs = item.expiresAt - Date.now();
  if (remainingMs <= 0) {
    memoryStore.delete(key);
    return 0;
  }
  return Math.ceil(remainingMs / 1000);
}

/**
 * Service providing helper methods for managing refresh tokens, rate-limiting cooldowns,
 * and temporary verification/reset tokens with seamless in-memory fallback.
 */
export const redisService = {
  async setRefreshToken(userId: string, token: string, ttlSeconds = 7 * 24 * 60 * 60) {
    const key = `refresh:${userId}`;
    setInMemory(key, token, ttlSeconds);
    if (redisConnected) {
      try {
        await redis.set(key, token, 'EX', ttlSeconds);
      } catch (_) {
        // Fallback handled silently
      }
    }
  },

  async getRefreshToken(userId: string): Promise<string | null> {
    const key = `refresh:${userId}`;
    if (redisConnected) {
      try {
        const val = await redis.get(key);
        if (val) return val;
      } catch (_) {
        // Fallback to memory
      }
    }
    return getFromMemory(key);
  },

  async deleteRefreshToken(userId: string) {
    const key = `refresh:${userId}`;
    deleteFromMemory(key);
    if (redisConnected) {
      try {
        await redis.del(key);
      } catch (_) {
        // Ignored
      }
    }
  },

  async setResendCooldown(email: string, ttlSeconds = 60) {
    const key = `cooldown:resend:${email.toLowerCase().trim()}`;
    setInMemory(key, '1', ttlSeconds);
    if (redisConnected) {
      try {
        await redis.set(key, '1', 'EX', ttlSeconds);
      } catch (_) {
        // Ignored
      }
    }
  },

  async getResendCooldown(email: string): Promise<number> {
    const key = `cooldown:resend:${email.toLowerCase().trim()}`;
    if (redisConnected) {
      try {
        const ttl = await redis.ttl(key);
        if (ttl > 0) return ttl;
      } catch (_) {
        // Fallback to memory
      }
    }
    return getMemoryTtl(key);
  },

  async setVerificationToken(token: string, userId: string, ttlSeconds = 86400) {
    const key = `verify:${token}`;
    setInMemory(key, userId, ttlSeconds);
    if (redisConnected) {
      try {
        await redis.set(key, userId, 'EX', ttlSeconds);
      } catch (_) {
        // Ignored
      }
    }
  },

  async getVerificationToken(token: string): Promise<string | null> {
    const key = `verify:${token}`;
    if (redisConnected) {
      try {
        const val = await redis.get(key);
        if (val) return val;
      } catch (_) {
        // Fallback to memory
      }
    }
    return getFromMemory(key);
  },

  async deleteVerificationToken(token: string) {
    const key = `verify:${token}`;
    deleteFromMemory(key);
    if (redisConnected) {
      try {
        await redis.del(key);
      } catch (_) {
        // Ignored
      }
    }
  },

  async setPasswordResetToken(token: string, userId: string, ttlSeconds = 3600) {
    const key = `reset:${token}`;
    setInMemory(key, userId, ttlSeconds);
    if (redisConnected) {
      try {
        await redis.set(key, userId, 'EX', ttlSeconds);
      } catch (_) {
        // Ignored
      }
    }
  },

  async getPasswordResetToken(token: string): Promise<string | null> {
    const key = `reset:${token}`;
    if (redisConnected) {
      try {
        const val = await redis.get(key);
        if (val) return val;
      } catch (_) {
        // Fallback to memory
      }
    }
    return getFromMemory(key);
  },

  async deletePasswordResetToken(token: string) {
    const key = `reset:${token}`;
    deleteFromMemory(key);
    if (redisConnected) {
      try {
        await redis.del(key);
      } catch (_) {
        // Ignored
      }
    }
  },
};
