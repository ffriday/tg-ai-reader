import type { AIProvider, AiType } from '@/types/ai';
import type { PropmtData } from '@/types/propmts';
import { getPreferencesData } from '@/utils/getPreferencesData';

export class AIService {
  private ai: AIProvider;
  private promptData: PropmtData;

  constructor(aiProvider: AIProvider, propmpFilePath: string) {
    this.ai = aiProvider;
    this.promptData = this.getPromptData(propmpFilePath);
  }

  getPromptData(path: string): PropmtData {
    try {
      return getPreferencesData(path);
    } catch (error) {
      console.error('Error loading prompt data:', error);
      throw new Error('Failed to load prompt data');
    }
  }

  async getIsPostInteresting(prompt: string) {
    return this.ai.getIsPostInteresting(prompt, this.promptData);
  }
}