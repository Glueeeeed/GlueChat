import {Elysia,status} from "elysia";
import {authModel} from "./model";
import {AuthService} from "./service";
import {AlreadyExistsError, InvalidDataFormatError, InvalidCredentialsError} from "../../utils/exceptions";
import {generateAuthToken, generateRefreshToken, verifyRefreshToken} from "../../utils/jwt";
import {join} from "path";
require("dotenv").config({ path: join(__dirname, "../..env") });


export const auth = new Elysia({ prefix: '/auth' })

.post('/register', async ({body}) =>  {
    try {
        const {nickname, password, accessCode, keys} = body;

        if (!keys) {
            return status(400, {
                success: false,
                message: "Keys are required"
            })
        }

        AuthService.validate(nickname, password, false);
        await AuthService.checkIfNicknameExists(nickname, false);
        await AuthService.registerUser(nickname, password, accessCode as string,keys as string );

        return status(201, {
            success: true,
            message: 'User registered successfully',
        })


    } catch (e) {
        console.error(e);
        if (e instanceof InvalidDataFormatError || e instanceof AlreadyExistsError || e instanceof InvalidCredentialsError) {
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
        const {nickname, password, code2fa} = body;
        AuthService.validate(nickname, password, true);
        await AuthService.checkIfNicknameExists(nickname, true);
        const userID : string = await AuthService.loginUser(nickname, password);

        const is2faEnabled = await AuthService.is2FAEnabled(userID);

        if (is2faEnabled) {
            if (!code2fa) {
                return {
                    success: true,
                    message: 'MFA required',
                    mfaRequired: true
                }
            }

            const is2faValid = await AuthService.verify2FACode(userID, code2fa);
            if (!is2faValid) {
                throw new InvalidCredentialsError("Invalid 2FA code");
            }
        }

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


    .get('/access', async ({ request, set }) => {
        const authHeader = request.headers.get('authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            set.status = 401;
            return { success: false, message: 'Unauthorized: Missing or invalid Authorization header' };
        }

        const token = authHeader.split(' ')[1];

        if (token !== process.env.ADMIN_API_KEY) {
            set.status = 401;
            return { success: false, message: 'Unauthorized' };
        }

        try {
            const code = await AuthService.generateAccessCode();
            return status(200, code);
        } catch {
            return status(500, { success: false, message: 'Error' });
        }
    })






