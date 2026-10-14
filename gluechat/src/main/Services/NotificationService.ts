import { NotificationManager } from '../Managers/NotificationManager';


export abstract class NotificationService {


  public static async showNewMessageNotification(senderName: string): Promise<void> {
    NotificationManager.sendNotification('New Message', `You have new message from ${senderName} `, false);
  }



  static showNewFriendNotification(accountName: string): void {
    NotificationManager.sendNotification('New Friend Request', `You have new friend request from ${accountName} `, false);
  }

  static showNewUpdateNotification(version: string): void {
    NotificationManager.sendNotification('New Update Available', `GlueChat has a new version ${version} `, true);
  }

  static showHideAppToTrayNotification(): void {
    NotificationManager.sendNotification('GlueChat', 'GlueChat is now running in the background', false);
  }
}
