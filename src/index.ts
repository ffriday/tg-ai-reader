import { sleep } from 'bun';
import { TelegramService } from './services/telegram.js';
import { GeminiAI } from '@/services/gemini.js';
import { AIService } from './services/ai.js';
import { ConfigManager, type AppConfig } from '@/config/config.js';
import { logger } from '@/utils/logger.js';

const gracefulShutdown = async (telegramService: TelegramService | null, exitCode: number = 0) => {
  logger.info('Shutting down gracefully...');
  try {
    if (telegramService) {
      await telegramService.disconnect();
    }
  } catch (error) {
    logger.error('Error during shutdown:', error);
  }
  process.exit(exitCode);
};

const main = async () => {
  let config: AppConfig;
  let telegramService: TelegramService | null = null;

  try {
    config = ConfigManager.loadConfig();
    logger.info('Configuration loaded successfully');
  } catch (error) {
    logger.error('Configuration error:', error);
    return;
  }

  // Setup graceful shutdown handlers
  process.on('SIGINT', () => gracefulShutdown(telegramService, 0));
  process.on('SIGTERM', () => gracefulShutdown(telegramService, 0));
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
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
    logger.info(`Fetched ${totalMessages} new messages from ${totalChannels} channels.`);

    for (const { dialog, messages } of dialogMessages) {
      logger.info(`Analyzing messages in dialog: ${dialog.name}`);
      const messagesToForward = [];
      
      for (const message of messages) {
        try {
          // Check if message has text content
          if (!message.text || typeof message.text !== 'string' || message.text.trim().length === 0) {
            logger.debug(`Skipping message without text content in ${dialog.name}`);
            continue;
          }

          const interestScore = await aiService.getIsPostInteresting(message.text);
          if (interestScore !== null && interestScore >= config.processing.interestThreshold) {
            messagesToForward.push(message);
          }
          logger.info(`Channel: ${dialog.name}\nMessage: ${message.text.slice(0, 50)}\nInterest Score: ${interestScore}`);
        } catch (error) {
          logger.error(`Error processing message in ${dialog.name}:`, error);
          // Continue processing other messages
        }
      }
      
      try {
        if (messagesToForward.length > 0) {
          await telegramService.forwardMessages(dialog, messagesToForward);
          logger.info(`Forwarded ${messagesToForward.length} messages from ${dialog.name}`);
        }
        
        await telegramService.markDialogAsRead(dialog);
      } catch (error) {
        logger.error(`Error processing dialog ${dialog.name}:`, error);
        // Continue processing other dialogs
      }
      
      await sleep(config.processing.timeout);
    }

    const cacheStats = aiService.getCacheStats();
    logger.info(`Processing completed. AI cache size: ${cacheStats.size} entries`);
    await gracefulShutdown(telegramService, 0);
  } catch (error) {
    logger.error('Fatal error:', error);
    await gracefulShutdown(telegramService, 1);
  }
};

main();