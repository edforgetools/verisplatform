import { NextResponse } from 'next/server';

// Mock the Upstash Redis and Ratelimit
const mockLimit = jest.fn();
const mockSlidingWindow = jest.fn();

jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({})),
}));

// Mock the static slidingWindow method
jest.mock('@upstash/ratelimit', () => {
  const RatelimitConstructor = jest.fn().mockImplementation(() => ({
    limit: mockLimit,
  }));
  
  (RatelimitConstructor as any).slidingWindow = mockSlidingWindow;
  
  return {
    Ratelimit: RatelimitConstructor,
  };
});

// Mock environment variables
const originalEnv = process.env;

describe('Rate Limiting Middleware', () => {
  let middleware: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      UPSTASH_REDIS_REST_URL: 'https://test-redis.upstash.io',
      UPSTASH_REDIS_REST_TOKEN: 'test-token',
      CRON_JOB_TOKEN: 'test-cron-token',
    };
    
    // Import middleware after mocks are set up
    const middlewareModule = await import('@/middleware');
    middleware = middlewareModule.middleware;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('should allow non-API requests to pass through', async () => {
    const request = new Request('https://example.com/page');
    const response = await middleware(request);
    
    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).toBe(200);
  });

  test('should allow API requests within rate limit', async () => {
    mockLimit.mockResolvedValue({ success: true });

    const request = new Request('https://example.com/api/test', {
      headers: {
        'x-forwarded-for': '127.0.0.1',
      },
    });
    
    const response = await middleware(request);
    
    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).toBe(200);
    expect(mockLimit).toHaveBeenCalledWith('api:127.0.0.1');
  });

  test('should block API requests exceeding rate limit', async () => {
    mockLimit.mockResolvedValue({ success: false });

    const request = new Request('https://example.com/api/test', {
      headers: {
        'x-forwarded-for': '127.0.0.1',
      },
    });
    
    const response = await middleware(request);
    
    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).toBe(429);
    
    const responseData = await response.json();
    expect(responseData.error).toBe('Too Many Requests');
  });

  test('should bypass rate limiting for authenticated cron jobs', async () => {
    const request = new Request('https://example.com/api/test', {
      headers: {
        'x-forwarded-for': '127.0.0.1',
        'x-cron-key': 'test-cron-token',
      },
    });
    
    const response = await middleware(request);
    
    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).toBe(200);
    expect(mockLimit).not.toHaveBeenCalled();
  });

  test('should bypass rate limiting for CRON_SECRET environment variable', async () => {
    process.env.CRON_SECRET = 'test-cron-secret';
    delete process.env.CRON_JOB_TOKEN;

    const request = new Request('https://example.com/api/test', {
      headers: {
        'x-forwarded-for': '127.0.0.1',
        'x-cron-key': 'test-cron-secret',
      },
    });
    
    const response = await middleware(request);
    
    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).toBe(200);
    expect(mockLimit).not.toHaveBeenCalled();
  });

  test('should use default IP when x-forwarded-for is not present', async () => {
    mockLimit.mockResolvedValue({ success: true });

    const request = new Request('https://example.com/api/test');
    
    const response = await middleware(request);
    
    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).toBe(200);
    expect(mockLimit).toHaveBeenCalledWith('api:127.0.0.1');
  });

  test('should handle different IPs separately', async () => {
    mockLimit.mockResolvedValue({ success: true });

    const request1 = new Request('https://example.com/api/test', {
      headers: { 'x-forwarded-for': '192.168.1.1' },
    });
    const request2 = new Request('https://example.com/api/test', {
      headers: { 'x-forwarded-for': '192.168.1.2' },
    });
    
    await middleware(request1);
    await middleware(request2);
    
    expect(mockLimit).toHaveBeenCalledWith('api:192.168.1.1');
    expect(mockLimit).toHaveBeenCalledWith('api:192.168.1.2');
  });
});
