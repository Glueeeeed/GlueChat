import {prisma} from "../../lib/prisma";
import {FriendsService} from "../friends/service";
import {NotFoundError} from "elysia";


export abstract class E2EEService {
    static async getBobPreKeys(aliceID: string, bobID : string): Promise<string> {
       const isFriends : boolean = await FriendsService.checkIfTheyAreFriends(aliceID, bobID);
       if (!isFriends) {
           throw new NotFoundError("Pre-Keys do not exist");
       }

            const pubKey = await prisma.identityKeys.findFirst({
                where: {
                    userID: bobID,
                },
                select: {
                    identityKey: true
                }
            })


           const spk = await prisma.signedPreKeys.findFirst({
               where: {
                   userID: bobID,
               },
               select: {
                   signedPubKey: true,
                   signature: true
               }
           });

           if (!spk) {
               throw new NotFoundError("Pre-Keys not found");
           }

           const opk = await prisma.oneTimePreKeys.findFirst({
               where: {
                   userId: bobID,
                   isUsed: false,
               },
               select: {
                   id: true,
                   keyId: true,
                   publicKey: true,
               }
           })

           if (!opk) {
               throw new NotFoundError("Pre-Keys do not exist");
           }

           await prisma.oneTimePreKeys.update({
               where: {
                   id: opk.id
               },
               data: {
                   isUsed: true,
                   usedAt: new Date(),
               }
           })

           const data = {
               pubKey: pubKey.identityKey,
               spk: spk.signedPubKey,
               signature: spk.signature,
               opkId: opk.keyId,
               opk: opk.publicKey
           }

           return JSON.stringify(data);
    }
}