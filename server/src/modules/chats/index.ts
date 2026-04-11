import {Elysia, status} from "elysia";
import {bearer} from "@elysiajs/bearer";
import {jwt} from "@elysiajs/jwt";
import {chatsModel} from "./model";
import {friendsModel} from "../friends/model";
import {ChatService} from "./service";

export const chats = new Elysia({ prefix: '/chats' })
    .use(bearer())
    .use(jwt({ name: 'jwt',
        secret: process.env.JWT_SECRET!
    }))
    .derive(async ({ jwt, bearer, set }) => {
        if (!bearer) {
            set.status = 401
            throw new Error('Unauthorized: No token provided')
        }

        console.log(bearer)

        const payload = await jwt.verify(bearer)
        if (!payload) {
            set.status = 401
            throw new Error('Unauthorized: Invalid token')
        }

        return {
            user: payload as { id: string } & typeof payload        }
    })

    .get('/', async ({user}) => {
        try {
            const chats =  await ChatService.getAllChats(user.id)
            console.log(chats)
            return status(200, {
                success: true,
                message: "Get all chats",
                data: chats
            })

        } catch (e) {
            return status(500, {
                success: false,
                message: "Something went wrong"
            })
        }
    }, {
        response: {
            201: chatsModel.chatInfoResponse
        }
    })