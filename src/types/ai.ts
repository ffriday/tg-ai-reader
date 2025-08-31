import type { PromptData } from './prompts';

export const GeminiModels = {
  gemini_1_5_flash: 'gemini-1.5-flash',
} as const;

export type GeminiModel = (typeof GeminiModels)[keyof typeof GeminiModels];

export type AIProvider = {
  getIsPostInteresting: (prompt: string, data: PromptData) => Promise<number | null>;
};