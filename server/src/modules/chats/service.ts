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
                        publicKey: true,
                    }
                },
                user2: {
                    select: {
                        id: true,
                        nickname: true,
                        publicKey: true,
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
                    publicKey: chat.user2.publicKey,
                };
            } else {
                return {
                    id: chat.id,
                    name: chat.user1.nickname,
                    status: "offline",
                    unread: false,
                    unreadCount: 0,
                    publicKey: chat.user1.publicKey,
                };
            }
        });



    }
}



