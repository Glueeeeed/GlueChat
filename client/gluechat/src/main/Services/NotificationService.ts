import { NotificationManager } from '../Managers/NotificationManager';
import path from 'path';
import { app } from 'electron';
import * as fs from 'node:fs';
import log from 'electron-log';

export abstract class NotificationService {
  private static async downloadAvatar(avatarUrl: string): Promise<string | undefined> {
    try {
      const response = await fetch(avatarUrl);
      if (!response.ok) return undefined;

      const buffer = Buffer.from(await response.arrayBuffer());
      const tempPath = path.join(app.getPath('temp'), `avatar_${Date.now()}.png`);
      await fs.promises.writeFile(tempPath, buffer);

      return tempPath;
    } catch (error) {
      log.error('Failed to get notification avatar:', error);
      return undefined;
    }
  }

  public static async showNewMessageNotification(senderName: string, avatarUrl?: string): Promise<void> {
    try {

      let iconPath: string | undefined;

      if (avatarUrl) {
        if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
          iconPath = await this.downloadAvatar(avatarUrl);
        } else if (fs.existsSync(avatarUrl)) {
          iconPath = avatarUrl;
        }
      }

      const icon = iconPath ? true : false;
      log.debug('icon', icon);

      if (icon) {
        NotificationManager.sendNotificationWithIcon('New Message', `You received new message from ${senderName}`, iconPath as string, false);
      } else {
        NotificationManager.sendNotification('New Message', `You received new message from ${senderName}`, false);
      }

      if (iconPath && iconPath.includes(app.getPath('temp'))) {
        setTimeout(() => {
          fs.unlink(iconPath!, () => {});
        }, 10000);
      }


    } catch (error) {
      log.error('Failed to get notification avatar:', error);
    }
  }



  static showNewFriendNotification(accountName: string): void {
    NotificationManager.sendNotification('New Friend Request!', `You have new friend request from ${accountName} `, false);
  }

  static showNewUpdateNotification(version: string): void {
    NotificationManager.sendNotification('New Update Available!', `GlueChat has a new version ${version} `, true);
  }

  static showHideAppToTrayNotification(): void {
    NotificationManager.sendNotification('GlueChat', 'GlueChat is now running in the background', false);
  }
}
