import { prisma } from "../lib/prisma";
import {Logger} from "./logger";



export abstract class MessageHandler {
    static async sendMessage(chatID: string, messageData : any): Promise<void> {
        try {
            await prisma.message.createMany({
                data: messageData.map((data: { deviceId: any; roomID: any; senderId: any; messageNumber: any; opkId: any; capsule: any; ephemeralPubKey: any; salt: any; content: any; nonce: any; encryptedMessageKey: any; messageKeyNonce: any; isDeleted: any; })  => ({
                    deviceId: data.deviceId,
                    roomID: data.roomID,
                    senderId: data.senderId,
                    messageNumber: data.messageNumber,
                    opkId: data.opkId || null,
                    capsule: data.capsule || null,
                    ephemeralPubKey: data.ephemeralPubKey || null,
                    salt: data.salt || null,
                    content: data.content,
                    nonce: data.nonce,
                    encryptedMessageKey: data.encryptedMessageKey,
                    messageKeyNonce: data.messageKeyNonce,
                    isDeleted: data.isDeleted || false,
                    isSeen: false,
                })),
            });
        } catch (error) {
            Logger.error("Failed to send message", error);
        }
    }
}