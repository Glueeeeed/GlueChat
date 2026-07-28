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
                user1: { select: { id: true, nickname: true } },
                user2: { select: { id: true, nickname: true } }
            }
        });

        return Promise.all(data.map(async (chat) => {
            const count = await prisma.message.count({
                where: {
                    roomID: chat.id,
                    NOT: {
                        senderId: userID
                    },
                    isSeen: false
                }
            });

            const unread = count !== 0;
            const otherUser = chat.user1.id === userID ? chat.user2 : chat.user1;

            return {
                id: chat.id,
                name: otherUser.nickname,
                status: "offline",
                unread: unread,
                unreadCount: count,
                receiverID: otherUser.id,
                senderID: userID,
            };
        }));
    }
}



