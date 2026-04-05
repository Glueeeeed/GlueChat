import {Elysia,status} from "elysia";
import {authModel} from "./model";
import {AuthService} from "./service";
import {AlreadyExistsError, InvalidDataFormatError} from "../../utils/exceptions";


export const auth = new Elysia({ prefix: '/auth' })

.post('/register', async ({body}) =>  {
    try {
        const {nickname, email, password} = body;

        await AuthService.checkIfNicknameExists(nickname as string);
        await AuthService.checkIfAccountExists(email as string);
        await AuthService.registerUser(nickname as string, email, password);

        return status(201, {
            success: true,
            message: 'User registered successfully',
        })


    } catch (e) {
        if (e instanceof InvalidDataFormatError || e instanceof AlreadyExistsError) {
            return status(e.statusCode, {
                success: false,
                message: e.message
            })
        }

        return status(500, {
            success: false,
            message: "Something went wrong",
        })
    }

}, {
    body: authModel.authBody,
    response: {
        201: authModel.authResponse,
    }

})



