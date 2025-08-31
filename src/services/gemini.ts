import { GenerativeModel, GoogleGenerativeAI, type GenerateContentRequest, type Part } from '@google/generative-ai';
import type { AIProvider, GeminiModel } from '@/types/ai';
import { promptIsPostInteresting } from '@/config/prompts';
import type { PromptData } from '@/types/prompts';
import { isNumber } from '@/utils/isNumber';

export class GeminiAI implements AIProvider {
  private ai: GoogleGenerativeAI;
  private model: GenerativeModel;

  constructor(
    apiKey: string | undefined,
    model: GeminiModel = 'gemini-1.5-flash',
  ) {
    if (!apiKey) {
      throw new Error('API key is required for GeminiAI');
    }

    this.ai = new GoogleGenerativeAI(apiKey);
    this.model = this.ai.getGenerativeModel({ model });
  }

  private async ask(prompt: string | GenerateContentRequest | (string | Part)[], retries: number = 3): Promise<string | null> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const result = await this.model.generateContent(prompt);
        const response = result.response;
        return response.text();
      } catch (error) {
        console.error(`Error analyzing post with Gemini (attempt ${attempt}/${retries}):`, error);
        
        if (attempt === retries) {
          return null;
        }
        
        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    return null;
  }

  public async getIsPostInteresting(post: string, criteria: Pick<PromptData, 'interesting' | 'uninteresting'>): Promise<number | null> {
    const parts: Part[] = [
      { text: promptIsPostInteresting(post) },
      { text: `Interesting topics: ${criteria.interesting.join(', ')}.` },
      { text: `Uninteresting topics: ${criteria.uninteresting.join(', ')}.` },
    ];
    const response = await this.ask(parts);
    const rate = Number(response);
    if (!isNumber(rate) || rate < 0 || rate > 1) {
      console.error('Gemini response is not a number between 0 and 1:', response);
      return null;
    }
    return rate;
  };
};