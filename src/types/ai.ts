import type { PropmtData } from './propmts';

export const AiType = {
  gemini: 'gemini',
  ollama: 'ollama',
} as const;

export type AiType = (typeof AiType)[keyof typeof AiType];

export type AiRole = 'system' | 'user' | 'assistant';

export const GeminiModels = {
  gemini_1_5_flash: 'gemini-1.5-flash',
} as const;

export type GeminiModel = (typeof GeminiModels)[keyof typeof GeminiModels];

export type AIProvider = {
  getIsPostInteresting: (prompt: string, data: PropmtData) => Promise<number | null>;
};