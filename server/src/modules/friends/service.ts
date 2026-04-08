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
            await prisma.friendship.create({
                data: {
                    senderId: userID,
                    receiverId: friendID,
                }
            })
        } catch (e: any) {
            throw new Error(e);
        }
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
                    {
                        senderId: userID,
                    },
                    {
                        receiverId: userID,
                    },
                ],
                status: 'ACCEPTED'
            },
        })
        return data
    }

    static async getAllRequests(userID: string) {
        const data = await prisma.friendship.findMany({
            where: {
                receiverId: userID,
                status: 'PENDING'
            }
        })
        return data
    }


}
