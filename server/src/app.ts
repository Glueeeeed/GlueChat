import { Elysia } from 'elysia'


import {test} from './modules/test'

const app = new Elysia({
    name: 'glue-chat backend server',
    prefix: '/api'
})
    .use(test)

app.listen(3000)

console.log(`🦊 Elysia is running at ${app.server?.url}`)