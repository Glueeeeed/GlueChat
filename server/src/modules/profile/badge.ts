import { prisma } from "../../lib/prisma";
import {Logger} from "../../utils/logger";

async function main() {
    const badge = await prisma.badge.create({
        data: {
            name: 'GlueChat Owner', // badge name
            imageUrl: '' // your url
        }
    });

    Logger.debug('Created Badge:', badge);


    await prisma.userBadges.create({
      data: {
        userId: 'cmpp9lcwa0000d8lifdar0mz6', // user id
        badgeId: badge.id
      }
    });
    Logger.debug('Signed Badge:', badge);

}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });