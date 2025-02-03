const NodeCache = require("node-cache");

class Cache {
  constructor() {
    this.cache = new NodeCache({
      stdTTL: 3600, // 1 hour default TTL
      checkperiod: 120, // Check for expired keys every 2 minutes
    });
  }

  get(key) {
    return this.cache.get(key);
  }

  set(key, value, ttl = 3600) {
    return this.cache.set(key, value, ttl);
  }

  del(key) {
    return this.cache.del(key);
  }
}

module.exports = new Cache();
