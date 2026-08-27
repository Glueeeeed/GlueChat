import {Elysia, t} from 'elysia'
import {MessageHandler} from "./utils/messageHandler";
import {cors} from '@elysiajs/cors'
import {staticPlugin} from '@elysiajs/static'


import {test} from './modules/test'
import {chats} from "./modules/chats";
import {auth} from "./modules/auth";
import {friends} from "./modules/friends";
import {prisma} from "./lib/prisma";
import {e2ee} from "./modules/e2ee";
import {FriendsService} from "./modules/friends/service";
import {profile} from "./modules/profile";
import {gluechat} from "./modules/app";
import {account} from "./modules/account";
import {Logger} from "./utils/logger";
import {panelApi} from "./modules/apis/panel-api";

export const activeConnections = new Map<string, Map<string, Set<any>>>();


const app = new Elysia({
    name: 'glue-chat backend server',
    prefix: '/api'
})
app.use(staticPlugin({
    assets: './src/public',
    prefix: '/auth/',
}))
    .use(cors())
    .use(test)
    .use(auth)
    .use(friends)
    .use(chats)
    .use(e2ee)
    .use(profile)
    .use(gluechat)
    .use(account)
    .use(panelApi)
    .ws('/ws', {
        body: t.Object({
            type: t.String(),
            chatID: t.Optional(t.String()),
            payload: t.Any()
        }),
        open(ws) {
            ws.data.userID = null;
            ws.data.deviceId = null;
        },
        async message(ws: any, data) {
            if (data.type === 'authenticate') {
                const userID = data.payload.userID || data.payload.userId;
                const deviceId = data.payload.deviceId;

                ws.data.userID = userID;
                ws.data.deviceId = deviceId;

                if (!activeConnections.has(userID)) {
                    activeConnections.set(userID, new Map());
                }

                const userConnections = activeConnections.get(userID)!;

                if (!userConnections.has(deviceId)) {
                    userConnections.set(deviceId, new Set());
                }

                userConnections.get(deviceId)?.add(ws);
                Logger.log(`User ${userID} connected on device ${deviceId}`);

                const friends = await FriendsService.getAllFriend(userID);
                friends.forEach(friend => {
                    const friendConns = activeConnections.get(friend.id);
                    if (friendConns) {
                        for (const deviceSet of friendConns.values()) {
                            for (const conn of deviceSet) {
                                conn.send({
                                    type: 'status-change',
                                    payload: {userID, status: 'online'}
                                });
                            }
                    }
                    }
                });
            }

            if (data.type === 'join-chat') {
                Logger.debug('Joined to chat:  ' + `chat-${data.chatID}`)
                ws.subscribe(`chat-${data.chatID}`);
            }

            if (data.type === 'send-message') {
                try {
                    const targetChatID = data.chatID || data.payload?.roomID || data.payload?.chatID;

                    if (!targetChatID) {
                        Logger.error('Cannot send message: missing chatID');
                        return;
                    }

                    const result = await MessageHandler.sendMessage(targetChatID as string, data.payload);

                    const responsePayload = {
                        type: 'receive-message',
                        payload: data.payload,
                        messageID: result
                    };

                    ws.publish(`chat-${targetChatID}`, responsePayload);

                    Logger.debug(`Message sent to room chat-${targetChatID}`);
                } catch (err) {
                    Logger.error(`Error sending message: ${err}`);
                }
            }

            if (data.type === 'mark-as-read') {
                await prisma.message.updateMany({
                    where: {
                        roomID: data.chatID,
                        isSeen: false,
                    },
                    data: {isSeen: true}
                });

                ws.publish(`chat-${data.chatID}`, {
                    type: 'messages-seen',
                    chatID: data.chatID
                });
            }
        },
        async close(ws: any) {
            const userID = ws.data?.userID;
            const deviceId = ws.data?.deviceId;

            if (!userID || !activeConnections.has(userID)) return;

            const userConns = activeConnections.get(userID)!;
            const deviceSet = userConns.get(deviceId);

            if (deviceSet) {
                deviceSet.delete(ws);
                if (deviceSet.size === 0) {
                    userConns.delete(deviceId);
                }
            }

            if (userConns.size === 0) {
                activeConnections.delete(userID);

                const friends = await FriendsService.getAllFriend(userID);
                for (const friend of friends) {
                    const friendsConns = activeConnections.get(friend.id);
                    if (friendsConns) {
                        for (const deviceMap of friendsConns.values()) {
                            for (const conn of deviceMap) {
                                conn.send({
                                    type: 'status-change',
                                    payload: {userID, status: 'offline'}
                                });
                            }
                        }
                    }
                }
            }
        }
    })
    .onError(({ code, error, set }) => {
        if (code === 'VALIDATION') {
            set.status = 422;
            return {
                success: false,
                message: error.message,
                status: 422,
                code: 'VALIDATION_ERROR'
            };
        }

        if (code === 'INVALID_FILE_TYPE') {
            set.status = 422;
            return {
                success: false,
                message: `Invalid type file: ${error.property}`,
                code: 'INVALID_FILE_TYPE'
            };
        }
    })



app.listen({
    port: 3000,
    tls: {

        // Uncomment if you use ssl

        // key: Bun.file('./certs/key.pem'),
        // cert: Bun.file('./certs/cert.pem'),
        // ca: Bun.file('./certs/ca.pem'),
    }
})

setInterval(async () => {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await prisma.friendship.deleteMany({
        where: {
            status: 'REJECTED',
            updatedAt: { lt: dayAgo }
        }
    });
}, 1000 * 60 * 60);

console.log(`🦊 Elysia is running at ${app.server?.url}`)