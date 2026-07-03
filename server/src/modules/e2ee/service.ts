import {prisma} from "../../lib/prisma";
import {FriendsService} from "../friends/service";
import {NotFoundError} from "elysia";


export abstract class E2EEService {

    static async getBobPreKeys(aliceID: string, bobID: string): Promise<string> {
        const isFriends = await FriendsService.checkIfTheyAreFriends(aliceID, bobID);
        if (!isFriends) throw new NotFoundError("Pre-Keys do not exist");

        const devices = await prisma.registeredDevices.findMany({
            where: { userId: bobID },
            include: {
                identityKeys: true,
                signedPreKeys: {
                    take: 1,
                    orderBy: { id: 'desc' }
                }
            }
        });

        const devicesWithKeys = await Promise.all(devices.map(async (device) => {
            const opk = await prisma.oneTimePreKeys.findFirst({
                where: {
                    userId: bobID,
                    deviceId: device.deviceId,
                    isUsed: false,
                },
                select: { keyId: true, publicKey: true, id: true }
            });

            if (opk) {
                await prisma.oneTimePreKeys.update({
                    where: { id: opk.id },
                    data: { isUsed: true, usedAt: new Date() }
                });
            }

            return {
                deviceId: device.deviceId,
                identityKey: device.identityKeys[0]?.identityKey,
                spk: device.signedPreKeys[0]?.signedPubKey,
                signature: device.signedPreKeys[0]?.signature,
                opkId: opk?.keyId,
                opk: opk?.publicKey
            };
        }));

        return JSON.stringify(devicesWithKeys);
    }

    static async getUserDevices(userId: string, id : string) {
        const isFriends : boolean = await FriendsService.checkIfTheyAreFriends(userId, id);
        if (!isFriends) throw new NotFoundError("Devices do not exist");

        return prisma.registeredDevices.findMany({
            where: {
                userId: userId,
            },
            select: {
                deviceId: true,
            }
        })
    }


    static async syncMessages(roomID: string, userID : string) {
        const data = await prisma.message.findMany({
            where: {
                roomID: roomID,
                NOT: {
                    senderId: userID
                },
                isSeen: false
            },
            orderBy: {
                createdAt: 'asc'
            }
        });

        if (data.length <= 0) {
            throw new NotFoundError("Not found");
        } else {
            console.log("M,ESSAGES DATA " + JSON.stringify(data));
            return data;
        }

    }

    static async makeAsRead(messageID: string) {
        const message = await prisma.message.findFirst({
            where: {
                nonce: messageID,
            }
        })
        if (!message) {
            throw new NotFoundError("Not found");
        }
        await prisma.message.update({
            where: {
                nonce: messageID,
            },
            data: {
                isSeen: true
            }
        })
    }
}
