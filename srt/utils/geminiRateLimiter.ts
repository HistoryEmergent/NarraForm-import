// Gemini API Rate Limiter
// Handles rate limiting for different Gemini models based on their specific limits

interface RequestRecord {
  timestamp: number;
  model: string;
  date: string; // YYYY-MM-DD format for daily tracking
}

export class GeminiRateLimiter {
  private requests: RequestRecord[] = [];
  private readonly STORAGE_KEY = 'gemini_rate_limiter_requests';

  // Rate limits per minute for different Gemini models (free tier)
  private readonly RATE_LIMITS: Record<string, number> = {
    'gemini-2.5-pro': 2,
    'gemini-2.5-flash': 15,
    'gemini-2.5-flash-8b': 15, 
    'gemini-2.0-flash-exp': 15,
    // Default fallback
    'default': 2
  };

  // Daily quotas for different Gemini models (free tier)
  private readonly DAILY_QUOTAS: Record<string, number> = {
    'gemini-2.5-pro': 50,
    'gemini-2.5-flash': 1500,
    'gemini-2.5-flash-8b': 1500,
    'gemini-2.0-flash-exp': 1500,
    // Default fallback
    'default': 50
  };

  constructor() {
    // Defer localStorage access to avoid SSR/initial load issues
    if (typeof window !== 'undefined') {
      this.loadRequestHistory();
    }
  }

  private loadRequestHistory(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Only keep requests from the last 24 hours to prevent memory buildup
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        this.requests = parsed.filter((req: RequestRecord) => {
          // Handle legacy records without date field
          if (!req.date) {
            return req.timestamp > oneDayAgo;
          }
          return req.timestamp > oneDayAgo;
        });
      }
    } catch (error) {
      console.warn('Failed to load rate limiter history:', error);
      this.requests = [];
    }
  }

  private saveRequestHistory(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.requests));
    } catch (error) {
      console.warn('Failed to save rate limiter history:', error);
    }
  }

  private getLimit(model: string): number {
    return this.RATE_LIMITS[model] || this.RATE_LIMITS.default;
  }

  private getDailyQuota(model: string): number {
    return this.DAILY_QUOTAS[model] || this.DAILY_QUOTAS.default;
  }

  private getTodaysDateString(): string {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  private cleanOldRequests(): void {
    const oneMinuteAgo = Date.now() - (60 * 1000);
    this.requests = this.requests.filter(req => req.timestamp > oneMinuteAgo);
  }

  private getRecentRequests(model: string): RequestRecord[] {
    this.cleanOldRequests();
    return this.requests.filter(req => req.model === model);
  }

  private getTodaysRequests(model: string): RequestRecord[] {
    const today = this.getTodaysDateString();
    return this.requests.filter(req => req.model === model && req.date === today);
  }

  canMakeRequest(model: string): boolean {
    // Check both per-minute rate limit and daily quota
    const recentRequests = this.getRecentRequests(model);
    const limit = this.getLimit(model);
    const withinRateLimit = recentRequests.length < limit;

    const todaysRequests = this.getTodaysRequests(model);
    const dailyQuota = this.getDailyQuota(model);
    const withinDailyQuota = todaysRequests.length < dailyQuota;

    return withinRateLimit && withinDailyQuota;
  }

  getWaitTime(model: string): number {
    const recentRequests = this.getRecentRequests(model);
    const limit = this.getLimit(model);
    const todaysRequests = this.getTodaysRequests(model);
    const dailyQuota = this.getDailyQuota(model);
    
    // If daily quota is exceeded, wait until tomorrow
    if (todaysRequests.length >= dailyQuota) {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      return tomorrow.getTime() - now.getTime();
    }
    
    // If per-minute rate limit is exceeded, wait for oldest request to expire
    if (recentRequests.length >= limit) {
      const sortedRequests = recentRequests.sort((a, b) => a.timestamp - b.timestamp);
      const oldestRequest = sortedRequests[0];
      const waitTime = (oldestRequest.timestamp + (60 * 1000)) - Date.now();
      return Math.max(0, waitTime);
    }

    return 0;
  }

  recordRequest(model: string): void {
    this.requests.push({
      timestamp: Date.now(),
      model,
      date: this.getTodaysDateString()
    });
    this.saveRequestHistory();
  }

  getRateLimitStatus(model: string): {
    currentRequests: number;
    maxRequests: number;
    dailyRequests: number;
    dailyQuota: number;
    waitTime: number;
    canRequest: boolean;
    quotaExceeded: boolean;
  } {
    const currentRequests = this.getRecentRequests(model).length;
    const maxRequests = this.getLimit(model);
    const dailyRequests = this.getTodaysRequests(model).length;
    const dailyQuota = this.getDailyQuota(model);
    const waitTime = this.getWaitTime(model);
    const canRequest = this.canMakeRequest(model);
    const quotaExceeded = dailyRequests >= dailyQuota;

    return {
      currentRequests,
      maxRequests,
      dailyRequests,
      dailyQuota,
      waitTime,
      canRequest,
      quotaExceeded
    };
  }

  // Helper method to wait for rate limit to clear
  async waitForRateLimit(model: string): Promise<void> {
    const waitTime = this.getWaitTime(model);
    if (waitTime > 0) {
      console.log(`Rate limit reached for ${model}, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  // Get formatted status for user display
  getStatusMessage(model: string): string {
    const status = this.getRateLimitStatus(model);
    
    if (status.quotaExceeded) {
      const waitHours = Math.ceil(status.waitTime / (1000 * 60 * 60));
      return `Daily quota exceeded (${status.dailyRequests}/${status.dailyQuota}). Try again in ${waitHours}h or switch to Gemini 2.5 Flash`;
    }
    
    if (status.canRequest) {
      return `${status.currentRequests}/${status.maxRequests} per minute, ${status.dailyRequests}/${status.dailyQuota} today`;
    } else {
      const waitSeconds = Math.ceil(status.waitTime / 1000);
      return `Rate limit reached (${status.currentRequests}/${status.maxRequests}). Wait ${waitSeconds}s`;
    }
  }

  // Get alternative model suggestions when quota is exceeded
  getAlternativeModel(model: string): string | null {
    if (model === 'gemini-2.5-pro') {
      return 'gemini-2.5-flash';
    }
    return null;
  }

  // Reset quota for a specific model (useful for testing)
  resetQuota(model?: string): void {
    if (model) {
      // Remove all requests for specific model
      this.requests = this.requests.filter(req => req.model !== model);
      console.log(`Reset quota for ${model}`);
    } else {
      // Clear all requests
      this.requests = [];
      console.log('Reset all quotas');
    }
    this.saveRequestHistory();
  }

  // Reset daily quota for a specific model (keeps rate limit history)
  resetDailyQuota(model?: string): void {
    const today = this.getTodaysDateString();
    if (model) {
      // Remove today's requests for specific model
      this.requests = this.requests.filter(req => !(req.model === model && req.date === today));
      console.log(`Reset daily quota for ${model}`);
    } else {
      // Remove all of today's requests
      this.requests = this.requests.filter(req => req.date !== today);
      console.log('Reset all daily quotas');
    }
    this.saveRequestHistory();
  }
}

// Singleton instance
export const geminiRateLimiter = new GeminiRateLimiter();
