import type { AIProvider } from '@/types/ai';
import type { PromptData } from '@/types/prompts';
import { getPreferencesData } from '@/utils/getPreferencesData';
import { MemoryCache } from '@/utils/cache';
import { logger } from '@/utils/logger';

export class AIService {
  private ai: AIProvider;
  private promptData: PromptData;
  private cache: MemoryCache<number>;

  constructor(aiProvider: AIProvider, promptFilePath: string, cacheEnabled: boolean = true) {
    this.ai = aiProvider;
    this.promptData = this.getPromptData(promptFilePath);
    this.cache = new MemoryCache<number>(3600000); // 1 hour cache
    
    if (cacheEnabled) {
      logger.info('AI response caching enabled');
    }
  }

  getPromptData(path: string): PromptData {
    try {
      const data = getPreferencesData(path);
      if (!data) {
        throw new Error('Failed to load prompt data: data is null');
      }
      return data;
    } catch (error) {
      logger.error('Error loading prompt data:', error);
      throw new Error('Failed to load prompt data');
    }
  }

  async getIsPostInteresting(prompt: string): Promise<number | null> {
    // Validate input
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      logger.warn('Empty or invalid prompt provided to AI service');
      return null;
    }

    // Limit prompt length to avoid API issues
    const maxPromptLength = 10000;
    const trimmedPrompt = prompt.length > maxPromptLength 
      ? prompt.substring(0, maxPromptLength) + '...' 
      : prompt;

    // Check cache first
    const cacheKey = `${trimmedPrompt}_${JSON.stringify(this.promptData)}`;
    const cachedResult = this.cache.get(cacheKey);
    if (cachedResult !== null) {
      logger.debug('Cache hit for prompt');
      return cachedResult;
    }

    // Get result from AI
    const result = await this.ai.getIsPostInteresting(trimmedPrompt, this.promptData);
    
    // Cache the result if it's valid
    if (result !== null) {
      this.cache.set(cacheKey, result);
      logger.debug('Cached AI response');
    }

    return result;
  }

  public getCacheStats(): { size: number } {
    return {
      size: this.cache.size(),
    };
  }

  public clearCache(): void {
    this.cache.clear();
    logger.info('AI response cache cleared');
  }
}