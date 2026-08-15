/**
 * High-performance API Client with SWR Caching & In-flight Deduplication
 */

const cacheStore = new Map();
const inflightRequests = new Map();

/**
 * Standard TTL (time to live) in milliseconds
 */
const DEFAULT_TTL = 30 * 1000; // 30 seconds fresh cache

/**
 * Generate a unique cache key based on URL, org, and user role
 */
function getCacheKey(url, session) {
  const orgId = session?.organizationId || 'default';
  const userId = session?.user?.id || session?.userId || 'anon';
  return `${orgId}:${userId}:${url}`;
}

/**
 * Perform a cached, deduplicated GET request with stale-while-revalidate capability
 * 
 * @param {string} url - API Endpoint URL
 * @param {object} session - Current user session
 * @param {object} options - Options: { ttl, force, tag, onBackgroundUpdate }
 * @returns {Promise<any>}
 */
export async function fetchWithCache(url, session, options = {}) {
  const { ttl = DEFAULT_TTL, force = false, tag = null, onBackgroundUpdate = null } = options;
  const key = getCacheKey(url, session);
  const now = Date.now();

  const cached = cacheStore.get(key);

  // If cache is fresh and not forcing refresh, return immediately
  if (!force && cached && (now - cached.timestamp < ttl)) {
    return cached.data;
  }

  // If cached data exists but is stale, return stale data immediately and revalidate in background
  if (!force && cached && cached.data !== undefined) {
    // Background revalidation
    revalidateInBackground(url, session, key, tag, onBackgroundUpdate);
    return cached.data;
  }

  // If there's an active in-flight request for the exact same key, share that promise
  if (inflightRequests.has(key)) {
    return inflightRequests.get(key);
  }

  // Perform actual fetch
  const fetchPromise = (async () => {
    try {
      const headers = {
        'Content-Type': 'application/json'
      };
      if (session?.accessToken) {
        headers['Authorization'] = `Bearer ${session.accessToken}`;
      }
      if (session?.organizationId) {
        headers['x-organization-id'] = session.organizationId;
      }

      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      
      // Store in cache
      cacheStore.set(key, {
        data,
        timestamp: Date.now(),
        tag: tag || extractTagFromUrl(url)
      });

      return data;
    } finally {
      inflightRequests.delete(key);
    }
  })();

  inflightRequests.set(key, fetchPromise);
  return fetchPromise;
}

/**
 * Revalidate stale cache entry in background without blocking UI
 */
async function revalidateInBackground(url, session, key, tag, onBackgroundUpdate) {
  if (inflightRequests.has(key)) return;

  const bgPromise = (async () => {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (session?.accessToken) headers['Authorization'] = `Bearer ${session.accessToken}`;
      if (session?.organizationId) headers['x-organization-id'] = session.organizationId;

      const response = await fetch(url, { headers });
      if (response.ok) {
        const data = await response.json();
        cacheStore.set(key, {
          data,
          timestamp: Date.now(),
          tag: tag || extractTagFromUrl(url)
        });
        if (typeof onBackgroundUpdate === 'function') {
          onBackgroundUpdate(data);
        }
      }
    } catch (err) {
      // Background revalidation error silently ignored
    } finally {
      inflightRequests.delete(key);
    }
  })();

  inflightRequests.set(key, bgPromise);
}

/**
 * Extract resource tag from URL
 */
function extractTagFromUrl(url) {
  if (url.includes('/payments')) return 'payments';
  if (url.includes('/residents')) return 'residents';
  if (url.includes('/properties')) return 'properties';
  if (url.includes('/members')) return 'members';
  if (url.includes('/expenses')) return 'expenses';
  if (url.includes('/dashboard')) return 'dashboard';
  if (url.includes('/audit-logs')) return 'audit';
  if (url.includes('/settlements')) return 'settlements';
  if (url.includes('/organization')) return 'organization';
  if (url.includes('/mess')) return 'mess';
  return 'general';
}

/**
 * Invalidate cache tags when mutations occur (e.g. creating/editing records)
 * 
 * @param {string|string[]} tags - Tag or array of tags to invalidate, e.g. 'payments', 'residents'
 */
export function invalidateCache(tags) {
  const tagList = Array.isArray(tags) ? tags : [tags];
  for (const [key, value] of cacheStore.entries()) {
    if (tagList.includes(value.tag) || tagList.includes('*')) {
      cacheStore.delete(key);
    }
  }
}

/**
 * Mutate a cache entry directly for optimistic UI updates
 */
export function mutateCache(url, session, updater) {
  const key = getCacheKey(url, session);
  const cached = cacheStore.get(key);
  if (cached) {
    const newData = typeof updater === 'function' ? updater(cached.data) : updater;
    cacheStore.set(key, {
      ...cached,
      data: newData,
      timestamp: Date.now()
    });
  }
}

/**
 * Helper to perform authenticated POST/PUT/DELETE requests with automatic cache invalidation
 */
export async function apiMutation(url, method, body, session, invalidateTags = []) {
  const headers = {
    'Content-Type': 'application/json'
  };
  if (session?.accessToken) {
    headers['Authorization'] = `Bearer ${session.accessToken}`;
  }
  if (session?.organizationId) {
    headers['x-organization-id'] = session.organizationId;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(result.message || 'API request failed');
    error.status = response.status;
    error.data = result;
    throw error;
  }

  if (invalidateTags && invalidateTags.length > 0) {
    invalidateCache(invalidateTags);
  }

  return result;
}
