import {Elysia, status} from "elysia";
import { bearer } from '@elysiajs/bearer'
import { jwt } from '@elysiajs/jwt'
import {friendsModel} from "./model";
import {NotFoundError} from "../../utils/exceptions";
import {FriendsService} from "./service"

export const friends = new Elysia({ prefix: '/friends' })
    .use(bearer())
    .use(jwt({ name: 'jwt',
        secret: process.env.JWT_SECRET!
    }))
    .derive(async ({ jwt, bearer, set }) => {
        if (!bearer) {
            set.status = 401
            throw new Error('Unauthorized: No token provided')
        }

        const payload = await jwt.verify(bearer)
        if (!payload) {
            set.status = 401
            throw new Error('Unauthorized: Invalid token')
        }

        return {
            user: payload as { id: string } & typeof payload        }
    })

    .post('/add-friend', async ({user,body}) => {
        try {
            const {nickname}  = body;
            console.log(nickname)
            await FriendsService.addFriend(user.id,nickname);
            return status(200, {
                success: true,
                message: 'Friend request sent successfully.'
            })
        } catch (e) {
            if (e instanceof NotFoundError) {
                return status(e.statusCode, {
                    success: false,
                    message: e.message
                })
            }
            console.error(e);
            return status(500, {
                success: false,
                message: "Something went wrong"
            })

        }


    }, {
        body: friendsModel.addFriendBody,
        response: {
            201: friendsModel.responseBody,
        }
    })
