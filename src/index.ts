import { sleep } from 'bun';
import { TelegramService } from './services/telegram.js';
import { GeminiAI } from '@/services/gemini.js';
import { AIService } from './services/ai.js';
import { ConfigManager, type AppConfig } from '@/config/config.js';

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
  let config: AppConfig;
  let telegramService: TelegramService | null = null;

  try {
    config = ConfigManager.loadConfig();
    console.log('Configuration loaded successfully');
  } catch (error) {
    console.error('Configuration error:', error);
    return;
  }

  // Setup graceful shutdown handlers
  process.on('SIGINT', () => gracefulShutdown(telegramService, 0));
  process.on('SIGTERM', () => gracefulShutdown(telegramService, 0));
  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    gracefulShutdown(telegramService, 1);
  });

  try {
    const aiProvider = new GeminiAI(config.ai.apiKey, 'gemini-1.5-flash', config.ai.requestInterval);
    const aiService = new AIService(aiProvider, config.prompts.filePath);

    telegramService = new TelegramService(
      config.telegram.sessionString,
      config.telegram.apiId,
      config.telegram.apiHash,
      config.telegram.chatFolder,
      config.telegram.targetChannelName,
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
          if (interestScore !== null && interestScore >= config.processing.interestThreshold) {
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
      
      await sleep(config.processing.timeout);
    }

    console.log("All messages processed.");
    await gracefulShutdown(telegramService, 0);
  } catch (error) {
    console.error('Fatal error:', error);
    await gracefulShutdown(telegramService, 1);
  }
};

main();