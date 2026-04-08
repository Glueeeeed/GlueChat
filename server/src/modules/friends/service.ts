import { prisma } from "../../lib/prisma";
import {NotFoundError} from "../../utils/exceptions";


export abstract class FriendsService {

    private static async findFriend(nickname : string) : Promise<string> {
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

     static async addFriend(userID : string, friendNickname : string) : Promise<void> {
        try {
            const friendID : string = await this.findFriend(friendNickname);
            await prisma.friendship.create({
                data: {
                    senderId: userID,
                    receiverId: friendID,
                }
            })
        } catch (e: any) {
            if (e instanceof NotFoundError) {
                throw new NotFoundError(e.message);
            }
            throw new Error(e);
        }
    }
}