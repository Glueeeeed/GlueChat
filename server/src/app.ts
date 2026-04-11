import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'


import {test} from './modules/test'
import {chats} from "./modules/chats";
import {auth} from "./modules/auth";
import {friends} from "./modules/friends";
import {prisma} from "./lib/prisma";

const app = new Elysia({
    name: 'glue-chat backend server',
    prefix: '/api'
})
    .use(cors())
    .use(test)
    .use(auth)
    .use(friends)
    .use(chats)

app.listen(3000)

setInterval(async () => {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await prisma.friendship.deleteMany({
        where: {
            status: 'REJECTED',
            updatedAt: { lt: dayAgo }
        }
    });
    console.log("Cleaned up expired friend rejections.");
}, 1000 * 60 * 60);

console.log(`🦊 Elysia is running at ${app.server?.url}`)