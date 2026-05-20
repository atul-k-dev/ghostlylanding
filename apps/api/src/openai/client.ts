import OpenAI from 'openai';
import { config } from '../config.js';

let cached: OpenAI | null = null;

export const getOpenAI = (): OpenAI => {
  if (cached) return cached;
  if (!config.openaiApiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }
  cached = new OpenAI({ apiKey: config.openaiApiKey });
  return cached;
};

export const hasOpenAI = (): boolean => Boolean(config.openaiApiKey);
