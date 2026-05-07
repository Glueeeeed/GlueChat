import {prisma} from "../../lib/prisma";

export abstract class ChatService {
    static async getAllChats(userID: string) {
        const data = await prisma.privateRoom.findMany({
            where: {
                OR: [
                    { userId: userID },
                    { userId2: userID },
                ],
            },
            include: {
                user1: {
                    select: {
                        id: true,
                        nickname: true,
                    }
                },
                user2: {
                    select: {
                        id: true,
                        nickname: true,
                    }
                }
            }
        })


        return data.map(chat => {
            if (chat.user1.id === userID) {
                return {
                    id: chat.id,
                    name: chat.user2.nickname,
                    status: "offline",
                    unread: false,
                    unreadCount: 0,
                    receiverID: chat.user2.id,
                    senderID: userID,
                };
            } else {
                return {
                    id: chat.id,
                    name: chat.user1.nickname,
                    status: "offline",
                    unread: false,
                    unreadCount: 0,
                    receiverID: chat.user1.id,
                    senderID: userID,
                };
            }
        });



    }
}



