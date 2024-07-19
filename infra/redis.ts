import { Config } from "sst";

// Redis cluster for caching
export const redis = new sst.aws.Redis("Redis");

// Redis configuration for Lambda functions
export const redisConfig = {
  REDIS_HOST: redis.host,
  REDIS_PORT: redis.port,
}; 