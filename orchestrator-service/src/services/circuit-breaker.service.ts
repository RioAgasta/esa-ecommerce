import { Injectable, Logger } from '@nestjs/common';

enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

interface CircuitBreakerState {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number;
  nextAttemptTime: number;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private breakers = new Map<string, CircuitBreakerState>();

  private readonly config = {
    FAILURE_THRESHOLD: 5,
    SUCCESS_THRESHOLD: 2,
    TIMEOUT_MS: 60000,
    HALF_OPEN_ATTEMPTS: 1,
  };

  async executeWithFallback<T>(
    serviceName: string,
    action: () => Promise<T>,
    fallback?: () => Promise<T>,
  ): Promise<T> {
    const breaker = this.getOrCreateBreaker(serviceName);

    if (breaker.state === CircuitState.OPEN) {
      if (Date.now() < breaker.nextAttemptTime) {
        this.logger.warn(`⚠️ Circuit breaker OPEN for ${serviceName}`);
        if (fallback) {
          this.logger.log(`📍 Executing fallback for ${serviceName}`);
          return fallback();
        }
        throw new Error(`Circuit breaker OPEN for ${serviceName}`);
      }

      breaker.state = CircuitState.HALF_OPEN;
      this.logger.log(`🔄 Circuit breaker transitioning to HALF_OPEN for ${serviceName}`);
    }

    try {
      const result = await action();

      if (breaker.state === CircuitState.HALF_OPEN) {
        breaker.successCount++;
        if (breaker.successCount >= this.config.SUCCESS_THRESHOLD) {
          breaker.state = CircuitState.CLOSED;
          breaker.failureCount = 0;
          breaker.successCount = 0;
          this.logger.log(`✅ Circuit breaker CLOSED for ${serviceName}`);
        }
      } else if (breaker.state === CircuitState.CLOSED) {
        breaker.failureCount = Math.max(0, breaker.failureCount - 1);
      }

      return result;
    } catch (error: any) {
      breaker.failureCount++;
      breaker.lastFailureTime = Date.now();

      if (breaker.failureCount >= this.config.FAILURE_THRESHOLD) {
        breaker.state = CircuitState.OPEN;
        breaker.nextAttemptTime = Date.now() + this.config.TIMEOUT_MS;
        this.logger.error(
          `❌ Circuit breaker OPEN for ${serviceName} after ${breaker.failureCount} failures`,
        );
      }

      if (breaker.state === CircuitState.HALF_OPEN) {
        breaker.state = CircuitState.OPEN;
        breaker.nextAttemptTime = Date.now() + this.config.TIMEOUT_MS;
      }

      if (fallback) {
        this.logger.log(`📍 Executing fallback for ${serviceName}`);
        return fallback();
      }

      throw error;
    }
  }

  private getOrCreateBreaker(serviceName: string): CircuitBreakerState {
    if (!this.breakers.has(serviceName)) {
      this.breakers.set(serviceName, {
        state: CircuitState.CLOSED,
        failureCount: 0,
        successCount: 0,
        lastFailureTime: 0,
        nextAttemptTime: 0,
      });
    }
    return this.breakers.get(serviceName);
  }
}
