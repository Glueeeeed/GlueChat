import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'


import {test} from './modules/test'
import {auth} from "./modules/auth";

const app = new Elysia({
    name: 'glue-chat backend server',
    prefix: '/api'
})
    .use(cors())
    .use(test)
    .use(auth)

app.listen(3000)

console.log(`🦊 Elysia is running at ${app.server?.url}`)