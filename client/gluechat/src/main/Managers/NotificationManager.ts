import { Notification } from 'electron';

export abstract class NotificationManager {
  static sendNotification(title: string, message: string, silent: boolean): void {
    new Notification({
      title: title,
      body: message,
      silent: silent
    }).show();
  }
  static sendNotificationWithIcon(title: string, message: string, icon: string, silent: boolean): void {
    new Notification({
      title: title,
      body: message,
      icon: icon,
      silent: silent
    })
  }
}
