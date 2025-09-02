import type { AIProvider, GeminiModel } from '@/types/ai';
import { promptIsPostInteresting, promptJsonOnly } from '@/config/prompts';
import type { PropmtData } from '@/types/propmts';
import { isNumber } from '@/utils/isNumber';
import type { OllamaRequest, OllamaResponse } from '@/types/ollama';

export class OllamaAI implements AIProvider {
  private url: string;
  private model: string;

  constructor(
    url: string,
    model: string,
  ) {
    this.url = url;
    this.model = model;
  }

  private async ask(prompt: OllamaRequest): Promise<OllamaResponse | null> {
    try {
      const result = await fetch(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(prompt),
      });
      if (result.ok) {
        const raw = await result.text();
        const response = JSON.parse(raw);
        return response;
      }
      console.error(`Error fetching ${this.model}:`, result.statusText);
      return null;
    } catch (error) {
      console.error(`Error analyzing post with ${this.model}:`, error);
      return null;
    }    
  }

  public async getIsPostInteresting(post: string, criteria: Pick<PropmtData, 'interesting' | 'uninteresting'>): Promise<number | null> {
    const prompt: OllamaRequest = {
      model: this.model,
      messages: [
        { role: 'system', content: promptJsonOnly },
        { role: 'user', content: promptIsPostInteresting(post) },
        { role: 'user', content: `Interesting topics: ${criteria.interesting.join(', ')}.` },
        { role: 'user', content: `Uninteresting topics: ${criteria.uninteresting.join(', ')}.` },
      ],
      stream: false,
      format: {
        type: "object",
        properties: {
          score: {
            type: "number"
          },
        },
        required: ["score"]
      },
      options: {
        temperature: 0
      }
    };

    const response = await this.ask(prompt);
    const message = response?.message?.content ?? "";
    const parsed = JSON.parse(message);
    const rate = Number(parsed?.score);
    if (!isNumber(rate) || rate < 0 || rate > 1) {
      console.error(`${this.model} response is not a number between 0 and 1:`, response);
      return null;
    }
    return rate;
  };
};