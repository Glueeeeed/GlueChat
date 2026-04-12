import { Elysia,t } from 'elysia'
import { cors } from '@elysiajs/cors'


import {test} from './modules/test'
import {chats} from "./modules/chats";
import {auth} from "./modules/auth";
import {friends} from "./modules/friends";
import {prisma} from "./lib/prisma";
import {e2ee} from "./modules/e2ee";

const app = new Elysia({
    name: 'glue-chat backend server',
    prefix: '/api'
})
    .use(cors())
    .use(test)
    .use(auth)
    .use(friends)
    .use(chats)
    .use(e2ee)
    .ws('/ws', {
        body: t.Object({
            type: t.String(),
            chatID: t.String(),
            payload: t.Any()
        }),
        open(ws) {
            console.log('User connected');
        },
        message(ws, data) {
            if (data.type === 'join-chat') {
                ws.subscribe(data.chatID);
                console.log(`User joined to room: ${data.chatID}`);
            }

            if (data.type === 'send-message') {
                ws.publish(data.chatID, {
                    type: 'receive-message',
                    payload: data.payload
                });
                console.log(data.payload)
            }
        },
        close(ws) {
            console.log('Client Disconnected');
        }
    })



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