import Redis from 'ioredis';

const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_URL = process.env.REDIS_URL;

/**
 * Configured IORedis client instance.
 */
export const redis = REDIS_URL
  ? new Redis(REDIS_URL)
  : new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    });

redis.on('connect', () => {
  console.log('⚡ Connected to Redis Server');
});

redis.on('error', (err) => {
  console.warn('⚠️ Redis Error (falling back gracefully):', err.message);
});

/**
 * Service providing helper methods for managing refresh tokens, rate-limiting cooldowns,
 * and temporary verification/reset tokens in Redis.
 */
export const redisService = {
  async setRefreshToken(userId: string, token: string, ttlSeconds = 7 * 24 * 60 * 60) {
    try {
      await redis.set(`refresh:${userId}`, token, 'EX', ttlSeconds);
    } catch (err) {
      console.error('Redis setRefreshToken error:', err);
    }
  },

  async getRefreshToken(userId: string): Promise<string | null> {
    try {
      return await redis.get(`refresh:${userId}`);
    } catch (err) {
      console.error('Redis getRefreshToken error:', err);
      return null;
    }
  },

  async deleteRefreshToken(userId: string) {
    try {
      await redis.del(`refresh:${userId}`);
    } catch (err) {
      console.error('Redis deleteRefreshToken error:', err);
    }
  },

  async setResendCooldown(email: string, ttlSeconds = 60) {
    try {
      const key = `cooldown:resend:${email.toLowerCase().trim()}`;
      await redis.set(key, '1', 'EX', ttlSeconds);
    } catch (err) {
      console.error('Redis setResendCooldown error:', err);
    }
  },

  async getResendCooldown(email: string): Promise<number> {
    try {
      const key = `cooldown:resend:${email.toLowerCase().trim()}`;
      const ttl = await redis.ttl(key);
      return ttl > 0 ? ttl : 0;
    } catch (err) {
      console.error('Redis getResendCooldown error:', err);
      return 0;
    }
  },

  async setVerificationToken(token: string, userId: string, ttlSeconds = 86400) {
    try {
      await redis.set(`verify:${token}`, userId, 'EX', ttlSeconds);
    } catch (err) {
      console.error('Redis setVerificationToken error:', err);
    }
  },

  async getVerificationToken(token: string): Promise<string | null> {
    try {
      return await redis.get(`verify:${token}`);
    } catch (err) {
      console.error('Redis getVerificationToken error:', err);
      return null;
    }
  },

  async deleteVerificationToken(token: string) {
    try {
      await redis.del(`verify:${token}`);
    } catch (err) {
      console.error('Redis deleteVerificationToken error:', err);
    }
  },

  async setPasswordResetToken(token: string, userId: string, ttlSeconds = 3600) {
    try {
      await redis.set(`reset:${token}`, userId, 'EX', ttlSeconds);
    } catch (err) {
      console.error('Redis setPasswordResetToken error:', err);
    }
  },

  async getPasswordResetToken(token: string): Promise<string | null> {
    try {
      return await redis.get(`reset:${token}`);
    } catch (err) {
      console.error('Redis getPasswordResetToken error:', err);
      return null;
    }
  },

  async deletePasswordResetToken(token: string) {
    try {
      await redis.del(`reset:${token}`);
    } catch (err) {
      console.error('Redis deletePasswordResetToken error:', err);
    }
  },
};
