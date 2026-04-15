import { prisma } from "../lib/prisma";

export  abstract class MessageHandler {
    static async sendMessage(chatID: string, messageData : any): Promise<string> {
        console.log(messageData.messageNumber);
        const id = await prisma.message.create({
            data: {
                numberMessage:  messageData.messageNumber,
                privateRoomId: messageData.roomID,
                senderId: messageData.senderID,
                capsule: messageData.capsule ? messageData.capsule : null,
                ephemeralPubKey: messageData.ephemeralPubKey ? messageData.ephemeralPubKey : null,
                salt: messageData.salt ? messageData.salt : null,
                content: messageData.content,
                nonce: messageData.nonce,
                isDeleted: messageData.isDeleted,
                isSeen: false,
            },
            select: {
                id: true
            }
        })

        return id.id;
    }
}