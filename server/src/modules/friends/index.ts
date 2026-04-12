import {Elysia, status} from "elysia";
import { bearer } from '@elysiajs/bearer'
import { jwt } from '@elysiajs/jwt'
import {friendsModel} from "./model";
import {NotFoundError} from "../../utils/exceptions";
import {FriendsService} from "./service"
import {join} from "path";
require("dotenv").config({ path: join(__dirname, "../.env") });
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
            const friendID : string = await  FriendsService.findFriend(nickname);
            if (friendID === user.id) {
                return  status(400, {
                    success: false,
                    message: "You can't send friend request to yourself"
                })
            }
            const areFriends : boolean = await FriendsService.checkIfTheyAreFriends(user.id,friendID);
            const isRejected : boolean = await FriendsService.checkIfFriendRequestRejected(user.id,friendID);
            const requestExists : boolean = await FriendsService.checkIfFriendRequestExists(user.id,friendID );
            if (areFriends) {
                return status(409, {
                    success: false,
                    message: 'You are already a friend with this user!'
                })
            }

            if (isRejected) {
                throw new NotFoundError("User not found.");
            }

            if (requestExists) {
                return status(409, {
                    success: false,
                    message: 'You\'ve already sent an invitation to this friend'
                })
            }
            await FriendsService.addFriend(user.id,friendID);
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


    .get('/', async ({user}) => {
       try {
           const friend = await FriendsService.getAllFriend(user.id);
           return status(200, {
               success: true,
               message: 'Get friends successfully.',
               data: friend
           })
       } catch (e) {
           console.error(e);
           return status(500, {
               success: false,
               message: "Something went wrong"
           })
       }



    }, {
        response: {
            201: friendsModel.responseBody,
        }
    })


    .get('/requests', async ({user}) => {
        try {
            const friend = await FriendsService.getAllRequests(user.id);
            return status(200, {
                success: true,
                message: 'Get requests successfully.',
                data: friend
            })
        } catch (e) {
            console.error(e);
            return status(500, {
                success: false,
                message: "Something went wrong"
            })
        }
    }, {
        response: {
            201: friendsModel.responseBody,
        }
    })

    .post('/requests', async ({user,body}) => {
        try {
            const {requestID, accept} = body;
            await FriendsService.manageRequest(user.id, requestID, accept);
            if (accept) {
                await FriendsService.createRoom(user.id,requestID)
            }
            return status(200, {
                success: true,
            })
        } catch (e) {
            if (e instanceof NotFoundError) {
                return status(e.statusCode, {
                    success: false,
                    message: "Request Not Found"
                })
            }
            return status(500, {
                success: false,
                message: "Something went wrong"
            })
        }
    }, {
        body: friendsModel.manageRequestBody,
        response: {
            201: friendsModel.responseBody,
        }
    })




