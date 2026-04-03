import { Elysia, status } from 'elysia'
import { TestService } from './service'
import {testModel} from "./model";


export const test = new Elysia({ prefix: '/test' })

    .get('/', () => {
        return {
            message: "OK",
            info: TestService.getAppInfo()
        }
    })

    .post('/', ({body}) => {

        console.log(body);
        return {
            message: "OK",
        }

    }, {
        body: testModel.testBody,
        response: {
            201: testModel.testResponse
        }
    })