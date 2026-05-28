import { prisma } from "../../lib/prisma";

async function main() {
    const badge = await prisma.badge.create({
        data: {
            name: 'GlueChat Owner', // badge name
            imageUrl: '' // your url
        }
    });

    console.log('Created Badge:', badge);


    await prisma.userBadges.create({
      data: {
        userId: 'cmpp9lcwa0000d8lifdar0mz6', // user id
        badgeId: badge.id
      }
    });
    console.log('Signed Badge:', badge);

}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });