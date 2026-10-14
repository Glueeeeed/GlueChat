import { prisma } from "../lib/prisma";
import {Logger} from "./logger";



export abstract class MessageHandler {
    static async sendMessage(chatID: string, messageData : any): Promise<void> {
        try {
            await prisma.message.createMany({
                data: messageData.map((data: { appSessionId : any ,messageId: any, deviceId: any; roomID: any; senderId: any; receiverId: any, messageNumber: any; opkId: any; capsule: any;  content: any; createdAt : any, encryptedMessageKey: any; })  => ({
                    appSessionId: data.appSessionId,
                    messageId: data.messageId,
                    deviceId: data.deviceId,
                    roomID: data.roomID,
                    senderId: data.senderId,
                    receiverId: data.receiverId,
                    messageNumber: data.messageNumber,
                    opkId: data.opkId || null,
                    capsule: data.capsule || null,
                    content: data.content,
                    createdAt: data.createdAt,
                    encryptedMessageKey: data.encryptedMessageKey,
                    isSeen: false,
                })),
            });
        } catch (error) {
            Logger.error("Failed to send message", error);
        }
    }
}