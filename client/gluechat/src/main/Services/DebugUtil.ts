import { DEBUG_MODE } from '../config'
export class DebugUtil {

  static log(message: string, ...args: any[]) : void {
    if (DEBUG_MODE) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }


  static error(message: string, ...args: any[]) : void {
    if (DEBUG_MODE) {
      console.error(`[DEBUG] ${message}`, ...args);
    }
  }
}
