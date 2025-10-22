import { NextRequest } from 'next/server';
import { rateLimit, clearAllBuckets } from '@/lib/rateLimit';

// Mock NextRequest for testing
function createMockRequest(ip: string = '127.0.0.1'): NextRequest {
  const headers = new Headers();
  headers.set('x-forwarded-for', ip);

  return {
    headers,
    method: 'POST',
  } as NextRequest;
}

describe('Rate Limiting', () => {
  beforeEach(() => {
    // Clear any existing buckets before each test
    clearAllBuckets();
  });

  test('should allow requests within rate limit', async () => {
    const request = createMockRequest('127.0.0.1');
    const result = await rateLimit(request, '/api/test', {
      capacity: 5,
      refillRate: 1,
      windowMs: 60000,
    });

    expect(result.allowed).toBe(true);
    expect(result.response).toBeUndefined();
  });

  test('should block requests exceeding rate limit', async () => {
    const request = createMockRequest('127.0.0.1');
    const config = {
      capacity: 2,
      refillRate: 0.01, // Very slow refill - 1 token per 100 seconds
      windowMs: 60000,
    };

    // First request should be allowed
    const result1 = await rateLimit(request, '/api/test', config);
    expect(result1.allowed).toBe(true);

    // Second request should be allowed
    const result2 = await rateLimit(request, '/api/test', config);
    expect(result2.allowed).toBe(true);

    // Third request should be blocked
    const result3 = await rateLimit(request, '/api/test', config);
    expect(result3.allowed).toBe(false);
    expect(result3.response).toBeDefined();
    expect(result3.response?.status).toBe(429);
  });

  test('should return proper error response when rate limited', async () => {
    const request = createMockRequest('127.0.0.1');
    const config = {
      capacity: 1,
      refillRate: 0.01, // Very slow refill
      windowMs: 60000,
    };

    // First request should be allowed
    const result1 = await rateLimit(request, '/api/test', config);
    expect(result1.allowed).toBe(true);

    // Second request should be blocked
    const result2 = await rateLimit(request, '/api/test', config);
    expect(result2.allowed).toBe(false);

    if (result2.response) {
      const responseData = await result2.response.json();
      expect(responseData.error).toBe('Too Many Requests');
      expect(responseData.message).toContain('Rate limit exceeded');
      expect(responseData.retryAfter).toBeDefined();

      // Check headers
      const retryAfter = result2.response.headers.get('Retry-After');
      expect(retryAfter).toBeDefined();
      expect(parseInt(retryAfter!)).toBeGreaterThan(0);
    }
  });

  test('should handle different IPs separately', async () => {
    const request1 = createMockRequest('127.0.0.1');
    const request2 = createMockRequest('192.168.1.1');
    const config = {
      capacity: 1,
      refillRate: 0.01, // Very slow refill
      windowMs: 60000,
    };

    // Both IPs should be able to make one request
    const result1 = await rateLimit(request1, '/api/test', config);
    const result2 = await rateLimit(request2, '/api/test', config);

    expect(result1.allowed).toBe(true);
    expect(result2.allowed).toBe(true);
  });

  test('should handle different routes separately', async () => {
    const request = createMockRequest('127.0.0.1');
    const config = {
      capacity: 1,
      refillRate: 0.01, // Very slow refill
      windowMs: 60000,
    };

    // Same IP should be able to make requests to different routes
    const result1 = await rateLimit(request, '/api/route1', config);
    const result2 = await rateLimit(request, '/api/route2', config);

    expect(result1.allowed).toBe(true);
    expect(result2.allowed).toBe(true);
  });

  test('should extract IP from x-forwarded-for header', async () => {
    const request = createMockRequest('203.0.113.1');
    const result = await rateLimit(request, '/api/test', {
      capacity: 5,
      refillRate: 1,
      windowMs: 60000,
    });

    expect(result.allowed).toBe(true);
  });

  test('should extract IP from x-real-ip header', async () => {
    const headers = new Headers();
    headers.set('x-real-ip', '198.51.100.1');

    const request = {
      headers,
      method: 'POST',
    } as NextRequest;

    const result = await rateLimit(request, '/api/test', {
      capacity: 5,
      refillRate: 1,
      windowMs: 60000,
    });

    expect(result.allowed).toBe(true);
  });
});
