import {Elysia,status} from "elysia";
import {authModel} from "./model";
import {AuthService} from "./service";
import {AlreadyExistsError, InvalidDataFormatError, NotFoundError, InvalidCredentialsError} from "../../utils/exceptions";
import { jwt } from '@elysiajs/jwt'
import {generateAuthToken, generateRefreshToken, verifyRefreshToken} from "../../utils/jwt";


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
        const userID : string = await AuthService.loginUser(email, password);
        const authToken : string = generateAuthToken(userID);
        const refreshToken : string = await generateRefreshToken(userID);
        console.log(refreshToken);
        return {
            success: true,
            message: 'Logged in successfully',
            authToken: authToken,
            refreshToken: refreshToken
        }

    } catch (e) {
        if (e instanceof InvalidDataFormatError || e instanceof NotFoundError || e instanceof InvalidCredentialsError) {
            return status(e.statusCode, {
                success: false,
                message: e.message
            })
        }
        console.error(e);
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

.post('/refresh', async ({body} ) =>  {
        const {refreshToken} = body;
        try {
            const userID : string | undefined = await verifyRefreshToken(refreshToken);
            const authToken : string = generateAuthToken(userID as string);
            const newRefreshToken : string = await generateRefreshToken(userID as string);

            return {
                success: true,
                message: 'Generated new tokens',
                authToken: authToken,
                refreshToken: newRefreshToken
            }

        } catch (e) {
            if (e instanceof Error) {
                return status(403, {
                    success: false,
                    message: e.message,
                })
            }
            console.error(e);
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




