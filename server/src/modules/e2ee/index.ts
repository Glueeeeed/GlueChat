import {Elysia, NotFoundError, status} from "elysia";
import {bearer} from "@elysiajs/bearer";
import {e2eeModel} from "./model";
import {jwt} from "@elysiajs/jwt";
import {E2EEService} from "./service";
import {authModel} from "../auth/model";


export const e2ee = new Elysia({ prefix: '/e2ee' })
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

    .get('/pre-keys/:id', async ({params: {id}, user}) => {
        try {

            const preKeys : string = await E2EEService.getBobPreKeys(user.id, id)
            console.log(`pre-keys ${preKeys}`)
            return status(200, {
                success: true,
                message: 'Pre key found',
                data: preKeys
            })

        } catch (e) {
            console.log(e)
            if (e instanceof NotFoundError) {
                return status(404, {
                    success: false,
                    message: e.message
                })
            }
            return status(500, {
                success: false,
                message: 'Something went wrong',
            })
        }
    }, {
        response: {
            201: e2eeModel.response
        }
    })

    .get('/check-token', async ({body} ) =>  {
        try {
           return status(200, {
               success: true,
               message: 'Token is valid',
           })

        } catch (e) {
            return status(500, {
                success: false,
                message: "Something went wrong",
            })
        }

    }, {
        body: authModel.refreshBody,
        response: {
            201: authModel.authResponse,
        }
    })
