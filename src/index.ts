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
const timeout = Number(Bun.env.TIMEOUT) || 1000;
const interestThreshold = Number(Bun.env.POST_INTEREST_THRESHOLD) || 0.5;

const validateEnvironmentVariables = () => {
  const requiredVars = {
    AI_KEY: aiApiKey,
    TG_API_ID: tgApiId,
    TG_API_HASH: tgApiHash,
  };

  const missingVars = Object.entries(requiredVars)
    .filter(([, value]) => !isString(value))
    .map(([key]) => key);

  if (missingVars.length > 0) {
    console.error(`Environment variables must be set and non-empty: ${missingVars.join(', ')}`);
    return false;
  }

  // Validate numeric values
  if (isNaN(timeout) || timeout < 0) {
    console.error('TIMEOUT must be a valid positive number');
    return false;
  }

  if (isNaN(interestThreshold) || interestThreshold < 0 || interestThreshold > 1) {
    console.error('POST_INTEREST_THRESHOLD must be a number between 0 and 1');
    return false;
  }

  return true;
};

const gracefulShutdown = async (telegramService: TelegramService | null, exitCode: number = 0) => {
  console.log('Shutting down gracefully...');
  try {
    if (telegramService) {
      await telegramService.disconnect();
    }
  } catch (error) {
    console.error('Error during shutdown:', error);
  }
  process.exit(exitCode);
};

const main = async () => {
  if (!validateEnvironmentVariables()) {
    return;
  }

  let telegramService: TelegramService | null = null;

  // Setup graceful shutdown handlers
  process.on('SIGINT', () => gracefulShutdown(telegramService, 0));
  process.on('SIGTERM', () => gracefulShutdown(telegramService, 0));
  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    gracefulShutdown(telegramService, 1);
  });

  try {
    const aiProvider = new GeminiAI(aiApiKey);
    const aiService = new AIService(
      aiProvider,
      './src/config/prompts.json',
    );

    telegramService = new TelegramService(
      sessionString,
      Number(tgApiId),
      tgApiHash,
      chatFolder,
      targetChannelName,
    );

    await telegramService.connect();

    const dialogMessages = await telegramService.getNewMessages();
    const totalChannels = dialogMessages.length;
    const totalMessages = dialogMessages.reduce((sum, { messages }) => sum + messages.length, 0);
    console.log(`Fetched ${totalMessages} new messages from ${totalChannels} channels.`);

    for (const { dialog, messages } of dialogMessages) {
      console.log(`Analyzing messages in dialog: ${dialog.name}`);
      const messagesToForward = [];
      
      for (const message of messages) {
        try {
          // Check if message has text content
          if (!message.text || typeof message.text !== 'string' || message.text.trim().length === 0) {
            console.log(`Skipping message without text content in ${dialog.name}`);
            continue;
          }

          const interestScore = await aiService.getIsPostInteresting(message.text);
          if (interestScore !== null && interestScore >= interestThreshold) {
            messagesToForward.push(message);
          }
          console.log(`Channel: ${dialog.name}\nMessage: ${message.text.slice(0, 50)}\nInterest Score: ${interestScore}`);
        } catch (error) {
          console.error(`Error processing message in ${dialog.name}:`, error);
          // Continue processing other messages
        }
      }
      
      try {
        if (messagesToForward.length > 0) {
          await telegramService.forwardMessages(dialog, messagesToForward);
          console.log(`Forwarded ${messagesToForward.length} messages from ${dialog.name}`);
        }
        
        await telegramService.markDialogAsRead(dialog);
      } catch (error) {
        console.error(`Error processing dialog ${dialog.name}:`, error);
        // Continue processing other dialogs
      }
      
      await sleep(timeout);
    }

    console.log("All messages processed.");
    await gracefulShutdown(telegramService, 0);
  } catch (error) {
    console.error('Fatal error:', error);
    await gracefulShutdown(telegramService, 1);
  }
};

main();