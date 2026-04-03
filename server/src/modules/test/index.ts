import { Elysia, status } from 'elysia'
import { TestService } from './service'


export const test = new Elysia({ prefix: '/test' })

    .get('/', () => {
        return {
            message: "OK",
            info: TestService.getAppInfo()
        }
    })