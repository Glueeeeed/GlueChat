import { prisma } from "../../lib/prisma";
import {NotFoundError} from "../../utils/exceptions";


export abstract class FriendsService {

    static async findFriend(nickname: string): Promise<string> {
        const friendID = await prisma.user.findFirst({
            where: {
                nickname: nickname,
            },
            select: {
                id: true,
            }
        })
        if (!friendID) {
            throw new NotFoundError("User not found");
        }
        return friendID.id;
    }

    static async addFriend(userID: string, friendID: string): Promise<void> {
        try {
            await prisma.friendship.upsert({
                where: {
                    senderId_receiverId: {
                        senderId: userID,
                        receiverId: friendID
                    }
                },
                update: {
                    status: 'PENDING'
                },
                create: {
                    senderId: userID,
                    receiverId: friendID,
                    status: 'PENDING'
                }
            });
        } catch (e: any) {
            throw new Error(e);
        }
    }

    static async checkIfFriendRequestRejected(userID: string, friendID: string): Promise<boolean> {
        const request = await prisma.friendship.findFirst({
            where: {
                OR: [
                    {senderId: userID, receiverId: friendID},
                ],
                status: 'REJECTED'
            },
        });
        if (!request) {
            return false;
        }
        return true;
    }

    static async checkIfFriendRequestExists(userID: string, friendID: string): Promise<boolean> {
        const request = await prisma.friendship.findFirst({
            where: {
                OR: [
                    {senderId: userID, receiverId: friendID,},
                    {senderId: friendID, receiverId: userID,},
                ],
                status: 'PENDING'
            },
        });
        if (!request) {
            return false;
        }
        return true;
    }

    static async checkIfTheyAreFriends(userID: string, friendID: string): Promise<boolean> {

        const friendship = await prisma.friendship.findFirst({
            where: {
                OR: [
                    {
                        senderId: userID,
                        receiverId: friendID,
                    },
                    {
                        senderId: friendID,
                        receiverId: userID,
                    },
                ],
                status: 'ACCEPTED'
            },
        });
        if (!friendship) {
            return false;
        }
        return true;
    }

    static async getAllFriend(userID: string) {
        const data = await prisma.friendship.findMany({
            where: {
                OR: [
                    { senderId: userID },
                    { receiverId: userID },
                ],
                status: 'ACCEPTED'
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        nickname: true
                    }
                },
                receiver: {
                    select: {
                        id: true,
                        nickname: true
                    }
                }
            }
        });

        return data.map(friendship => {
            if (friendship.senderId === userID) {
                return {
                    id: friendship.receiver.id,
                    nickname: friendship.receiver.nickname,
                    status: 'offline'
                };
            } else {
                return {
                    id: friendship.sender.id,
                    nickname: friendship.sender.nickname,
                    status: 'offline'
                };
            }
        });
    }
    static async getAllRequests(userID: string) {
        const data = await prisma.friendship.findMany({
            where: {
                receiverId: userID,
                status: 'PENDING'
            },
            include: {
                sender: {
                    select: {
                        nickname: true
                    }
                }
            }
        });

        return data.map(request => ({
            id: request.id,
            nickname: request.sender.nickname
        }));
    }

    static async manageRequest(userID: string, requestID : string, accepted : boolean): Promise<void> {
        const receiver = await prisma.friendship.findFirst({
            where: {
                AND: {
                    receiverId: userID,
                    id: requestID
                }
            }
        })
        if (!receiver) {
            throw new NotFoundError("You can't manage this request");
        }
        await prisma.friendship.update({
            where: {
                id: requestID
            },
            data: {
                status: accepted ? "ACCEPTED" : "REJECTED",
            },
        });

    }

}
