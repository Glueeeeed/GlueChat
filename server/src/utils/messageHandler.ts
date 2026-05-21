import { prisma } from "../lib/prisma";

export abstract class MessageHandler {
    static async sendMessage(chatID: string, messageData : any): Promise<string> {
        const id = await prisma.message.create({
            data: {

                privateRoom: { connect: { id: chatID } },
                sender: { connect: { id: messageData.senderID } },

                messageNumber: messageData.messageNumber,
                opkId: messageData.opkId || null,
                capsule: messageData.capsule || null,
                ephemeralPubKey: messageData.ephemeralPubKey || null,
                salt: messageData.salt || null,
                content: messageData.content,
                nonce: messageData.nonce,
                isDeleted: messageData.isDeleted || false,
                isSeen: false,
            },
            select: {
                id: true
            }
        });

        return id.id;
    }
}