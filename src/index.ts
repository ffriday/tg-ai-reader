import { sleep } from 'bun';
import { TelegramService } from './services/telegram.js';
import { GeminiAI } from '@/services/gemini.js';
import { AIService } from './services/ai.js';
import { isString } from './utils/isString.js';

const aiApiKey = Bun.env.AI_KEY;
const tgApiId = Bun.env.TG_API_ID;
const tgApiHash = Bun.env.TG_API_HASH;
const sessionString = Bun.env.TG_SESSION_STRING;
const chatFolder = Bun.env.TG_CHAT_FOLDER;
const targetChannelName = Bun.env.TG_TARGET_CHANNEL;
const timeout = Number(Bun.env.TIMEOUT);
const interestThreshold = Number(Bun.env.POST_INTEREST_THRESHOLD) || 0.5;

const main = async () => {
  if (!isString(aiApiKey) || !isString(tgApiId) || !isString(tgApiHash)) {
    console.error('Environment variables AI_KEY, TG_API_ID, and TG_API_HASH must be set and non-empty.');
    return;
  }

  const aiProvider = new GeminiAI(aiApiKey);
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