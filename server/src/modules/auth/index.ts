import {Elysia,status} from "elysia";
import {authModel} from "./model";
import {AuthService} from "./service";
import {AlreadyExistsError, InvalidDataFormatError, InvalidCredentialsError} from "../../utils/exceptions";
import {generateAuthToken, generateRefreshToken, verifyRefreshToken} from "../../utils/jwt";


export const auth = new Elysia({ prefix: '/auth' })

.post('/register', async ({body}) =>  {
    try {
        const {nickname, password} = body;

        AuthService.validate(nickname, password, false);
        await AuthService.checkIfNicknameExists(nickname, false);
        await AuthService.registerUser(nickname, password);

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


.post('/login', async ({body}) =>  {
    try {
        const {nickname,password} = body;
        AuthService.validate(nickname, password,true);
        await AuthService.checkIfNicknameExists(nickname, true);
        const userID : string = await AuthService.loginUser(nickname, password);
        const authToken : string = generateAuthToken(userID);
        const refreshToken : string = await generateRefreshToken(userID);
        return {
            success: true,
            message: 'Logged in successfully',
            authToken: authToken,
            refreshToken: refreshToken
        }

    } catch (e) {
        if (e instanceof InvalidDataFormatError  || e instanceof InvalidCredentialsError) {
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




