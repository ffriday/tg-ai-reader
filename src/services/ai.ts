import type { AIProvider } from '@/types/ai';
import type { PromptData } from '@/types/prompts';
import { getPreferencesData } from '@/utils/getPreferencesData';

export class AIService {
  private ai: AIProvider;
  private promptData: PromptData;

  constructor(aiProvider: AIProvider, promptFilePath: string) {
    this.ai = aiProvider;
    this.promptData = this.getPromptData(promptFilePath);
  }

  getPromptData(path: string): PromptData {
    try {
      const data = getPreferencesData(path);
      if (!data) {
        throw new Error('Failed to load prompt data: data is null');
      }
      return data;
    } catch (error) {
      console.error('Error loading prompt data:', error);
      throw new Error('Failed to load prompt data');
    }
  }

  async getIsPostInteresting(prompt: string): Promise<number | null> {
    // Validate input
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      console.warn('Empty or invalid prompt provided to AI service');
      return null;
    }

    // Limit prompt length to avoid API issues
    const maxPromptLength = 10000;
    const trimmedPrompt = prompt.length > maxPromptLength 
      ? prompt.substring(0, maxPromptLength) + '...' 
      : prompt;

    return this.ai.getIsPostInteresting(trimmedPrompt, this.promptData);
  }
}