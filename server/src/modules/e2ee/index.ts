import {Elysia,status} from "elysia";
import {bearer} from "@elysiajs/bearer";
import {jwt} from "@elysiajs/jwt";


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
