import type { PropmtData } from './propmts';

export const GeminiModels = {
  gemini_1_5_flash: 'gemini-1.5-flash',
} as const;

export type GeminiModel = (typeof GeminiModels)[keyof typeof GeminiModels];

export type AIProvider = {
  getIsPostInteresting: (prompt: string, data: PropmtData) => Promise<number | null>;
};