import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions";
import type { TotalList } from 'telegram/Helpers';
import type { Entity } from 'telegram/define';
import type { Dialog } from 'telegram/tl/custom/dialog';
import { readLineInput } from '@/utils/cli';
import { setEnv } from '@/utils/setEnv';
import type { DialogMessage } from '@/types/telegram';

export class TelegramService {
  private client: TelegramClient;
  private session: StringSession;
  private dialogs: TotalList<Dialog> | null = null;
  private chatFolder: string | undefined;
  private targetChannelName: string | undefined;
  private targetChannel: Dialog | undefined | null;

  constructor(
    sessionString: string | undefined,
    apiId: number,
    apiHash: string,
    chatFolder: string | undefined,
    targetChannelName: string | undefined,
    timeout?: number,
  ) {
    this.session = new StringSession(sessionString);
    this.chatFolder = chatFolder;
    this.targetChannelName = targetChannelName;
    this.client = new TelegramClient(this.session, apiId, apiHash, {
      connectionRetries: 5,
    });
  }

  public static matchPeer(peer: Api.TypeInputPeer, entity: Entity | undefined): boolean {
    if (!peer || !entity) return false;

    if (peer instanceof Api.PeerChannel && entity instanceof Api.Channel) {
      return (peer as Api.PeerChannel).channelId === entity.id;
    }
    if (peer instanceof Api.PeerChat && entity instanceof Api.Chat) {
      return (peer as Api.PeerChat).chatId === entity.id;
    }
    if (peer instanceof Api.PeerUser && entity instanceof Api.User) {
      return (peer as Api.PeerUser).userId === entity.id;
    }
    return false;
  }

  public static filterHasUnread(dialogs: Dialog[]) {
    return dialogs.filter((d) => d.unreadCount && d.unreadCount > 0);
  }

  public async connect() {
    await this.client.start({
      phoneNumber: async () => readLineInput("Please enter your phone number: "),
      password: async () => readLineInput("Please enter your password: "),
      phoneCode: async () => readLineInput("Please enter the code you received: "),
      onError: (err) => console.error(err),
    });

    console.log("Telegram client connected successfully.");
    this.saveSession();
  }

  public async disconnect() {
    await this.client.disconnect();
  }

  private saveSession() {
    const sessionString = this.session.save();
    setEnv("TG_SESSION_STRING", sessionString);
  }

  public async fetchDialogList() {
    try {
      this.dialogs = await this.client.getDialogs();
    } catch (error) {
      console.error("Error fetching dialog list:", error);
    }
  }

  public async getChannels() {
    if (!this.dialogs) {
      await this.fetchDialogList();
    }
    return this.dialogs ? this.dialogs.filter(({ isChannel, isGroup }) => isChannel && !isGroup) : [];
  }

  public async getGroups() {
    if (!this.dialogs) {
      await this.fetchDialogList();
    }
    return this.dialogs ? this.dialogs.filter(({ isGroup }) => isGroup) : [];
  }

  public async getPrivateChats() {
    if (!this.dialogs) {
      await this.fetchDialogList();
    }
    return this.dialogs ? this.dialogs.filter(({ isUser }) => isUser) : [];
  }

  private async getChatFolders() {
    try {
      const result = await this.client.invoke(new Api.messages.GetDialogFilters());
      return result.filters;
    } catch (error) {
      console.error("Error fetching chat folders:", error);
      return [];
    }
  }

  private async getAiFolder() {
    const folders = await this.getChatFolders();
    return folders.find((folder) => {
      if (folder instanceof Api.DialogFilter) {
        const title = folder.title.text;
        return title === this.chatFolder;
      }
    });
  }

  public async getAiFolderChats() {
    const channels = await this.getChannels();
    const folder = await this.getAiFolder();

    if (!folder || !Array.isArray(channels) || !(folder instanceof Api.DialogFilter)) {
      console.error("AI folder not found or channels are not an array");
      return [];
    }

    return channels.filter((channel) => {
      const entity = channel.entity;

      if (folder.excludePeers.some((p) => TelegramService.matchPeer(p, entity))) {
        return false;
      }

      if (folder.includePeers.some((p) => TelegramService.matchPeer(p, entity))) {
        return true;
      }

      if (folder.broadcasts && entity instanceof Api.Channel && !entity.megagroup) {
        return true;
      }

      return false;
    });
  }

  public async markDialogAsRead(dialog: Dialog) {
    try {
      if (dialog.isChannel) {
        await this.client.invoke(
          new Api.channels.ReadHistory({
            channel: dialog.id,
            maxId: 0
          })
        );
      } else {
        await this.client.invoke(
          new Api.messages.ReadHistory({
            peer: dialog.id,
            maxId: 0
          })
        );
      }
    } catch (error) {
      console.error("Error marking dialog as read:", error);
    }
  }

  public async getUnreadMessagesInDialog(dialog: Dialog, limit: number = 100) {
    const entity = dialog.entity;
    const unreadCount = dialog.unreadCount || 0;
    if (unreadCount === 0) {
      return [];
    }

    return await this.client.getMessages(entity, { limit: unreadCount });
  }

  public async getNewMessages() {
    const chats = await this.getAiFolderChats();
    const unread = TelegramService.filterHasUnread(chats);
    const messages: DialogMessage[] = [];

    for (const dialog of unread) {
      const dialogMessages = await this.getUnreadMessagesInDialog(dialog);
      messages.push({ dialog, messages: dialogMessages });
    }

    return messages;
  }

  private async findChannelByName() {
    if (!this.dialogs) {
      await this.fetchDialogList();
    }
    if (!this.dialogs) return;

    this.targetChannel = this.dialogs.find((dialog) =>
      dialog.isChannel &&
      dialog.entity instanceof Api.Channel &&
      dialog.entity.title === this.targetChannelName
    ) || null;
  }

  public async forwardMessages(fromDialog: Dialog, messages: Api.Message[]) {
    if (!this.targetChannel) {
      await this.findChannelByName();
    }

    if (!this.targetChannel) {
      console.error("Target channel is not set");
      return;
    }

    const fromEntity = fromDialog.entity;
    const toEntity = this.targetChannel.entity;
    if (!fromEntity || !toEntity) {
      console.error("Invalid entities");
      return;
    }
    const messageIds = messages.map((msg) => msg.id);

    await this.client.invoke(
      new Api.messages.ForwardMessages({
        fromPeer: fromEntity,
        toPeer: toEntity,
        id: messageIds,
        withMyScore: false,
        dropAuthor: false,
      })
    );
  }
};