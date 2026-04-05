import {Elysia,status} from "elysia";
import {authModel} from "./model";
import {AuthService} from "./service";


export const auth = new Elysia({ prefix: '/auth' })

.post('/register', async ({body}) =>  {
    const {nickname, email, password} = body;
    const nicknameExists =  await AuthService.checkIfNicknameExists(nickname as string);
    if (nicknameExists) {
        return status(429, {
            success: false,
            message: 'Nickname already exists',
        })
    }

    const accountExists = await AuthService.checkIfAccountExists( email as string);
    if (accountExists) {
        return status(429, {
            success: false,
            message: 'Account with this email already exists',
        })
    }

    await AuthService.registerUser(nickname as string, email, password);
    return status(201, {
        success: true,
        message: 'User registered successfully',
    })



}, {
    body: authModel.authBody,
    response: {
        201: authModel.authResponse,
    }

})



