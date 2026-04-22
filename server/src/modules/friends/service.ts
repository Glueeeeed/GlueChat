import { prisma } from "../../lib/prisma";
import {NotFoundError} from "../../utils/exceptions";
import {activeConnections} from "../../app";


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
                    status: activeConnections.has(friendship.receiver.id) ? 'online' : 'offline',
                };
            } else {
                return {
                    id: friendship.sender.id,
                    nickname: friendship.sender.nickname,
                    status: activeConnections.has(friendship.sender.id) ? 'online' : 'offline'
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
                    id: requestID,
                    status: "PENDING"
                }
            }
        })
        if (!receiver) {
            throw new NotFoundError("Request not found");
        }
        const result = await prisma.friendship.update({
            where: {
                id: requestID,
            },
            data: {
                status: accepted ? "ACCEPTED" : "REJECTED",
            },
        });
        if (!result) {
            throw new NotFoundError("Request Not Found");
        }

    }


    static async createRoom(targetID: string,requestID : string): Promise<void> {
        const data = await prisma.friendship.findFirst({
            where: {
                id: requestID,
            },
            select: {
                senderId: true
            }
        })
        if (!data) {
            throw new NotFoundError("You can't manage this request");
        }
        await prisma.privateRoom.create({
            data: {
                userId: data.senderId as string,
                userId2: targetID
            }
        })
    }

}
