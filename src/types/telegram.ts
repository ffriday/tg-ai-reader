import type { Api } from 'telegram';
import type { Dialog } from 'telegram/tl/custom/dialog';

export type DialogMessage = {
  dialog: Dialog;
  messages: Api.Message[];
}