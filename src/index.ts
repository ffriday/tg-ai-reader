import { sleep } from 'bun';
import { TelegramService } from './services/telegram.js';
import { GeminiAI } from '@/services/gemini.js';
import { AIService } from './services/ai.js';
import { isString } from './utils/isString.js';
import { OllamaAI } from './services/ollama.js';
import { AiType, type AIProvider } from './types/ai.js';

const aiType = Bun.env.AI_TYPE;
const aiApiKey = Bun.env.AI_KEY;
const tgApiId = Bun.env.TG_API_ID;
const tgApiHash = Bun.env.TG_API_HASH;
const sessionString = Bun.env.TG_SESSION_STRING;
const chatFolder = Bun.env.TG_CHAT_FOLDER;
const targetChannelName = Bun.env.TG_TARGET_CHANNEL;
const timeout = Number(Bun.env.TIMEOUT);
const interestThreshold = Number(Bun.env.POST_INTEREST_THRESHOLD) || 0.5;
const ollamaApiUrl = Bun.env.OLLAMA_API_URL;
const ollamaModel = Bun.env.OLLAMA_MODEL;

const main = async () => {
  if (!isString(aiType) || (aiType !== AiType.gemini && aiType !== AiType.ollama)) {
    console.error(`Invalid AI_TYPE. Supported types are: ${Object.values(AiType).join(', ')}`);
    return;
  }

  if (!isString(tgApiId) || !isString(tgApiHash)) {
    console.error('Environment variables TG_API_ID and TG_API_HASH must be set and non-empty.');
    return;
  }

  let aiProvider: AIProvider | null = null;

  if (aiType === AiType.gemini && !isString(aiApiKey)) {
    console.error('Environment variables AI_KEY, TG_API_ID, and TG_API_HASH must be set and non-empty.');
    return;
  } else {
    aiProvider = new GeminiAI(aiApiKey);
  }

  if (aiType === AiType.ollama && (!isString(ollamaApiUrl) || !isString(ollamaModel))) {
    console.error('Environment variables OLLAMA_API_URL and OLLAMA_MODEL must be set and non-empty.');
    return;
  } else {
    aiProvider = new OllamaAI(ollamaApiUrl as string, ollamaModel as string);
  }

  const aiService = new AIService(
    aiProvider,
    './src/config/prompts.json',
  );

  const telegramService = new TelegramService(
    sessionString,
    Number(tgApiId),
    tgApiHash,
    chatFolder,
    targetChannelName,
  );

  await telegramService.connect();

  const msg = await telegramService.getNewMessages();
  const totalChannels = msg.length;
  const totalMessages = msg.reduce((sum, { messages }) => sum + messages.length, 0);
  console.log(`Fetched ${totalMessages} new messages from ${totalChannels} channels.`);

  for (const { dialog, messages } of msg) {
    console.log(`Analyzing messages in dialog: ${dialog.name}`);
    const toForward = [];
    for (const message of messages) {
      const r = await aiService.getIsPostInteresting(message.text);
      if (r !== null && r >= interestThreshold) {
        toForward.push(message);
      }
      console.log(`Channel: ${dialog.name}\nMessage: ${message.text.slice(0, 50)}\nInterest Score: ${r}`);
      console.log(`Sleeping for ${timeout}ms...`);
      await sleep(timeout);
    }
    if (toForward.length > 0) {
      await telegramService.forwardMessages(dialog, toForward);
    }
    await telegramService.markDialogAsRead(dialog);
  }

  console.log("All messages processed.");
  await telegramService.disconnect();
  process.exit(0);
};

main();