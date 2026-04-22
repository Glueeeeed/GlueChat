import { Elysia,t } from 'elysia'
import {MessageHandler} from "./utils/messageHandler";
import { cors } from '@elysiajs/cors'


import {test} from './modules/test'
import {chats} from "./modules/chats";
import {auth} from "./modules/auth";
import {friends} from "./modules/friends";
import {prisma} from "./lib/prisma";
import {e2ee} from "./modules/e2ee";
import {FriendsService} from "./modules/friends/service";

export const activeConnections = new Map<string, Set<any>>();

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
            chatID: t.Optional(
                t.String(),
            ),
            payload: t.Any()
        }),
        open() {
            console.log('User connected');
        },
        async message(ws : any, data) {


            if (data.type === 'authenticate') {
                ws.data.userID = data.payload.userID;
                console.log("connected user" + ws.data.userID);
                if (!activeConnections.has(ws.data.userID)) {
                    activeConnections.set(ws.data.userID, new Set());
                }
                activeConnections.get(ws.data.userID)?.add(ws);

                const friends = await FriendsService.getAllFriend(ws.data.userID);
                friends.forEach(friend => {
                    const friendConns = activeConnections.get(friend.id);
                    if (friendConns) {
                        friendConns.forEach(conn => conn.send({
                            type: 'status-change',
                            payload: {userID: ws.data.userID, status: 'online'},
                        }))
                    }
                })

            }

            if (data.type === 'join-chat') {
                ws.subscribe(data.chatID);
                console.log(`User joined to room: ${data.chatID}`);
            }



            if (data.type === 'send-message') {
                const id =  MessageHandler.sendMessage(data.chatID, data.payload).then(result => {
                    ws.publish(data.chatID, {
                        type: 'receive-message',
                        payload: data.payload,
                        messageID: result
                    });
                })
                console.log(data.payload)
            }

            if (data.type === 'mark-as-read') {
                prisma.message.updateMany({
                    where: {
                        roomID: data.chatID,
                        isSeen: false,
                        // senderId: { not: data.payload.r }
                    },
                    data: { isSeen: true }
                }).then(() => {
                    ws.publish(data.chatID, {
                        type: 'messages-seen',
                        chatID: data.chatID
                    });
                });
            }
        },
         async close(ws : any) {
            if (ws.data.userID &&  activeConnections.has(ws.data.userID)) {
                const conns = activeConnections.get(ws.data.userID);
                conns?.delete(ws.data.userID);

                const friends = await FriendsService.getAllFriend(ws.data.userID);
                friends.forEach(friend => {
                    const friendConns = activeConnections.get(friend.id);
                    if (friendConns) {
                        friendConns.forEach(conn => conn.send({
                            type: 'status-change',
                            payload: {userID: ws.data.userID, status: 'offline'},
                        }))
                    }
                })
                activeConnections.delete(ws.data.userID);
            }
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