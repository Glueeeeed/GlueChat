import {prisma} from "../../lib/prisma";
import {FriendsService} from "../friends/service";
import {OneTimeKey} from "../account/service"
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
                spk: device.signedPreKeys[0]?.signedPubKey,
                signature: device.signedPreKeys[0]?.signature,
                opkId: opk?.keyId,
                opk: opk?.publicKey
            };
        }));

        return JSON.stringify(devicesWithKeys);
    }

    static async getIdentityKey(deviceId: string , userId : string): Promise<string> {
        const record = await prisma.identityKeys.findFirst({
            where: {
                userID: userId,
                deviceId: deviceId,
            },
            select: {
                identityKey: true,
            }
        })
        if (!record) throw new NotFoundError("Identity key not found");
        return record.identityKey;
    }

    static async getUserDevices(userId: string, id : string) {
        const isFriends : boolean = await FriendsService.checkIfTheyAreFriends(userId, id);
        if (!isFriends) throw new NotFoundError("Devices do not exist");

        return prisma.registeredDevices.findMany({
            where: {
                userId: id,
            },
            select: {
                deviceId: true,
            }
        })
    }


    static async syncMessages(roomID: string, userID : string, deviceId : string) {
        const data = await prisma.message.findMany({
            where: {
                roomID: roomID,
                deviceId: deviceId,
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
        await prisma.message.delete({
            where: {
                nonce: messageID,
            },
        })
    }

    static async checkOpkQty(userId : string, deviceId : string) : Promise<number> {
        return prisma.oneTimePreKeys.count({
            where: {
                userId: userId,
                deviceId: deviceId,
            }
        });
    }

    static async updateOnetimePreKeys(userId : string, deviceId : string, opk : string) : Promise<void> {
        const parsedKey : OneTimeKey[] = JSON.parse(opk);

        if (parsedKey && parsedKey.length > 0) {
            await prisma.oneTimePreKeys.createMany({
                data: parsedKey.map(key => ({
                    userId: userId,
                    keyId: key.id,
                    publicKey: key.pubKey,
                    deviceId: deviceId,
                }))
            });
        } else {
            throw new NotFoundError("Failed to update onetime pre key");
        }

    }


}
