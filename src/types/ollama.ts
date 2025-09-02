import type { AiRole } from '@/types/ai';

export type OllamaRequest = {
  model: string;
  messages: Array<{
    role: AiRole;
    content: string;
  }>;
  stream: boolean;
  format: {
    type: string;
    properties?: Record<string, { type: string }>;
    required?: string[];
  };
  options: {
    temperature: number;
  };
};
 
export type OllamaResponse = {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done_reason: string;
  done: boolean;
  total_duration: number;
  load_duration: number;
  prompt_eval_count: number;
  prompt_eval_duration: number;
  eval_count: number;
  eval_duration: number;
};
