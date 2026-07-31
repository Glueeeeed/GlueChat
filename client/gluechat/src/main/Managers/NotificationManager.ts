import {Notification} from 'electron'

export abstract class  NotificationManager {
  static sendNotification(title : string, message : string, silent : boolean) : void {
    new Notification({
      title: title,
      body: message,
      silent: silent,
    }).show();
  }
}
