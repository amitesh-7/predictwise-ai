const crypto = require('crypto');

/**
 * Simple In-Memory Cache Service
 * Cache is now user-specific to prevent data leakage between users
 */

// In-memory cache store
const cache = new Map();
const CACHE_TTL = 1 * 60 * 60 * 1000; // 1 hour (reduced from 24 hours)

/**
 * Generate hash from file buffer
 */
function generateFileHash(buffer) {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

/**
 * Generate cache key from multiple files
 * Now includes userId to make cache user-specific
 */
function generateCacheKey(files, subject, examName, userId = 'anonymous') {
  const fileHashes = files.map(f => generateFileHash(f.buffer)).sort().join('-');
  const contextHash = crypto.createHash('md5')
    .update(`${subject}-${examName}-${userId}`)
    .digest('hex')
    .substring(0, 8);
  return `analysis:${userId}:${fileHashes.substring(0, 32)}:${contextHash}`;
}

/**
 * Get cached analysis
 */
function getCachedAnalysis(key) {
  const cached = cache.get(key);
  
  if (!cached) return null;
  
  // Check if expired
  if (Date.now() > cached.expiresAt) {
    cache.delete(key);
    return null;
  }
  
  console.log(`📦 Cache hit for key: ${key.substring(0, 30)}...`);
  return cached.data;
}

/**
 * Store analysis in cache
 */
function cacheAnalysis(key, data, ttl = CACHE_TTL) {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttl,
    createdAt: Date.now()
  });
  
  console.log(`💾 Cached analysis with key: ${key.substring(0, 30)}...`);
  
  // Cleanup old entries periodically
  if (cache.size > 100) {
    cleanupExpiredEntries();
  }
}

/**
 * Invalidate cache for a specific user
 */
function invalidateUserCache(userId) {
  let cleared = 0;
  for (const key of cache.keys()) {
    if (key.includes(`:${userId}:`)) {
      cache.delete(key);
      cleared++;
    }
  }
  if (cleared > 0) {
    console.log(`🗑️ Cleared ${cleared} cache entries for user ${userId}`);
  }
}

/**
 * Remove expired cache entries
 */
function cleanupExpiredEntries() {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, value] of cache.entries()) {
    if (now > value.expiresAt) {
      cache.delete(key);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
  }
}

/**
 * Clear all cache
 */
function clearCache() {
  cache.clear();
  console.log('🗑️ Cache cleared');
}

/**
 * Get cache stats
 */
function getCacheStats() {
  return {
    size: cache.size,
    entries: Array.from(cache.entries()).map(([key, value]) => ({
      key: key.substring(0, 40) + '...',
      createdAt: new Date(value.createdAt).toISOString(),
      expiresAt: new Date(value.expiresAt).toISOString(),
      isExpired: Date.now() > value.expiresAt
    }))
  };
}

module.exports = {
  generateFileHash,
  generateCacheKey,
  getCachedAnalysis,
  cacheAnalysis,
  invalidateUserCache,
  clearCache,
  getCacheStats,
  cleanupExpiredEntries
};
