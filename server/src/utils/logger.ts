import fs from 'fs';
import path from 'path';
import { DEBUG_MODE, WEBHOOK_URL } from '../config';

const logFile = path.join(__dirname, '../../logs/server.log');

export class Logger {
    private static writeToFile(message: string) {
        const timestamp = new Date().toISOString();
        if (!fs.existsSync(path.dirname(logFile))) {
            fs.mkdirSync(path.dirname(logFile), { recursive: true });
        }
        fs.appendFileSync(logFile, `[${timestamp}] ${message}\n`);
    }

    private static async sendToDiscord(level: string, message: string) {
        if (!WEBHOOK_URL) return;

        try {
            await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: `**[${level}]** ${message}`
                })
            });
        } catch (e) {
            console.error("Failed to send to discord", e);
        }
    }

    static log(message: any, ...args: any[]) {
        this.writeToFile(`[INFO] ${message} ${JSON.stringify(args)}`);
        console.log(`[INFO] ${message}`, ...args);
    }

    static debug(message: any, ...args: any[]) {
        if (DEBUG_MODE) {
            this.writeToFile(`[DEBUG] ${message} ${JSON.stringify(args)}`);
            console.log(`[DEBUG] ${message}`, ...args);
        }
    }


    static warn(message: any, ...args: any[]) {
        this.writeToFile(`[WARN] ${message} ${JSON.stringify(args)}`);
        console.warn(`[WARN] ${message}`, ...args);
    }

    static error(message: any, ...args: any[]) {
        const fullMessage = `${message} ${JSON.stringify(args)}`;
        this.writeToFile(`[ERROR] ${fullMessage}`);

        console.error(`[ERROR] ${message}`, ...args);

        this.sendToDiscord("ERROR", fullMessage);
    }
}