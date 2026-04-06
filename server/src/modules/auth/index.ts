import {Elysia,status} from "elysia";
import {authModel} from "./model";
import {AuthService} from "./service";
import {AlreadyExistsError, InvalidDataFormatError, NotFoundError, InvalidCredentialsError} from "../../utils/exceptions";


export const auth = new Elysia({ prefix: '/auth' })

.post('/register', async ({body}) =>  {
    try {
        const {nickname, email, password} = body;

        AuthService.validate(nickname as string, email, password);
        await AuthService.checkIfNicknameExists(nickname as string);
        await AuthService.checkIfAccountExists(email as string,false);
        await AuthService.registerUser(nickname as string, email, password);

        return status(201, {
            success: true,
            message: 'User registered successfully',
        })


    } catch (e) {
        if (e instanceof InvalidDataFormatError || e instanceof AlreadyExistsError || e instanceof NotFoundError ) {
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


.post('/login', async ({body}) =>  {
    try {
        const {email, password} = body;
        AuthService.validate(null, email, password);
        await AuthService.checkIfAccountExists(email as string, true);
        await AuthService.loginUser(email, password);
    } catch (e) {
        if (e instanceof InvalidDataFormatError || e instanceof NotFoundError || e instanceof InvalidCredentialsError) {
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



