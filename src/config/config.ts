import { isString } from '@/utils/isString';

export interface AppConfig {
  ai: {
    apiKey: string;
    requestInterval: number;
  };
  telegram: {
    apiId: number;
    apiHash: string;
    sessionString?: string;
    chatFolder?: string;
    targetChannelName?: string;
  };
  processing: {
    timeout: number;
    interestThreshold: number;
  };
  prompts: {
    filePath: string;
  };
}

export class ConfigManager {
  private static validateRequired(value: unknown, name: string): string {
    if (!isString(value)) {
      throw new Error(`${name} must be set and non-empty`);
    }
    return value;
  }

  private static validateNumber(value: unknown, name: string, min?: number, max?: number): number {
    const num = Number(value);
    if (isNaN(num)) {
      throw new Error(`${name} must be a valid number`);
    }
    if (min !== undefined && num < min) {
      throw new Error(`${name} must be >= ${min}`);
    }
    if (max !== undefined && num > max) {
      throw new Error(`${name} must be <= ${max}`);
    }
    return num;
  }

  public static loadConfig(): AppConfig {
    const requiredEnvVars = {
      AI_KEY: Bun.env.AI_KEY,
      TG_API_ID: Bun.env.TG_API_ID,
      TG_API_HASH: Bun.env.TG_API_HASH,
    };

    // Validate required environment variables
    const missingVars = Object.entries(requiredEnvVars)
      .filter(([, value]) => !isString(value))
      .map(([key]) => key);

    if (missingVars.length > 0) {
      throw new Error(`Environment variables must be set and non-empty: ${missingVars.join(', ')}`);
    }

    // Load and validate configuration
    const config: AppConfig = {
      ai: {
        apiKey: this.validateRequired(Bun.env.AI_KEY, 'AI_KEY'),
        requestInterval: this.validateNumber(Bun.env.AI_REQUEST_INTERVAL || '1000', 'AI_REQUEST_INTERVAL', 100),
      },
      telegram: {
        apiId: this.validateNumber(Bun.env.TG_API_ID, 'TG_API_ID', 1),
        apiHash: this.validateRequired(Bun.env.TG_API_HASH, 'TG_API_HASH'),
        sessionString: Bun.env.TG_SESSION_STRING,
        chatFolder: Bun.env.TG_CHAT_FOLDER,
        targetChannelName: Bun.env.TG_TARGET_CHANNEL,
      },
      processing: {
        timeout: this.validateNumber(Bun.env.TIMEOUT || '1000', 'TIMEOUT', 0),
        interestThreshold: this.validateNumber(Bun.env.POST_INTEREST_THRESHOLD || '0.5', 'POST_INTEREST_THRESHOLD', 0, 1),
      },
      prompts: {
        filePath: Bun.env.PROMPTS_FILE_PATH || './src/config/prompts.json',
      },
    };

    return config;
  }
}