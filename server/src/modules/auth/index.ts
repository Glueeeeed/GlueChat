import {Elysia,status} from "elysia";
import {authModel} from "./model";
import {AuthService} from "./service";
import {AlreadyExistsError, InvalidDataFormatError, InvalidCredentialsError} from "../../utils/exceptions";
import {generateAuthToken, generateRefreshToken, verifyRefreshToken, verifyResetPasswordToken} from "../../utils/jwt";
import {join} from "path";
import {Logger} from "../../utils/logger";
require("dotenv").config({ path: join(__dirname, "../..env") });


export const auth = new Elysia({ prefix: '/auth' })

.post('/register', async ({body}) =>  {
    try {
        const {nickname, password, accessCode} = body;
        if (AuthService.checkIfMaintenance(nickname)) {
            return status(503, {
                success: false,
                message: 'GlueChat is currently undergoing scheduled maintenance. Please try again later.',
            });
        }
        const nicknameFormatted : string =  nickname.toLowerCase();
        await AuthService.validate(nicknameFormatted, password);
        await AuthService.checkIfNicknameExists(nicknameFormatted, false);
        const id = await AuthService.registerUser(nicknameFormatted, password, accessCode as string);
        const authToken : string = generateAuthToken(id as string);


        Logger.debug("AUTH TOKEN: " + authToken);


        return status(201, {
            success: true,
            message: 'User registered successfully',
            authToken: authToken,
        })


    } catch (e) {
        if (e instanceof InvalidDataFormatError || e instanceof AlreadyExistsError || e instanceof InvalidCredentialsError) {
            return status(e.statusCode, {
                success: false,
                message: e.message
            })
        }
        Logger.error(e);
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
        if (AuthService.checkIfMaintenance(nickname)) {
            return status(503, {
                success: false,
                message: 'GlueChat is currently undergoing scheduled maintenance. Please try again later.',
            });
        }
        const nicknameFormatted : string =  nickname.toLowerCase();
        await AuthService.checkIfNicknameExists(nicknameFormatted, true);
        const userID : string = await AuthService.loginUser(nicknameFormatted, password);

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
        Logger.error(e);
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
            Logger.error(e);
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
        } catch (e) {
            Logger.error(e);
            return status(500, { success: false, message: 'Error' });
        }
    })

    .post('/reset-password/request', async ({body}) => {
        try {
            const {email} = body;
            await AuthService.resetPasswordRequest(email);
            return status(200, {
                success: true,
                message: 'Ok'
            })

        } catch (e) {
            Logger.error(e);
            return status(500, {
                success: false,
                message: "Something went wrong"
            })
        }
    }, {
        body: authModel.resetPasswordRequest
    })

    .get('/reset-password/:token', async ({ params: {token}, cookie: {session}}) => {
        try {
            await verifyResetPasswordToken(token);
            session.value = token;
            session.httpOnly = true
            session.maxAge = 3600
            session.path = '/'
            return Bun.file('./src/public/recovery.html');
        } catch (e) {
            Logger.error(e);
            return status(500, {
                success: false,
                message: 'Unauthorized: Missing or invalid Token'
            })
        }
    })

    .post('/reset-password/', async ({body, cookie: {session}}) => {
        try {
            const {password, repeatPassword} = body;
            const token = session.value;
            if (!token) {
                return status(400, {
                    success: false,
                    message: 'Unauthorized: Missing or invalid Token'
                })
            }
            const data = await verifyResetPasswordToken(token as string);
            await AuthService.resetPassword(data.id, data.session, password, repeatPassword);
            return status(200, {
                success: true,
                message: 'Password reset successfully'
            })
        } catch (e) {
            if (e instanceof InvalidDataFormatError) {
                return status(e.statusCode, {
                    success: false,
                    message: e.message,
                })
            }
            Logger.error(e);
            return status(500, {
                success: false,
                message: 'Error'
            })
        }
    }, {
        body: authModel.resetPassword,
        response: {
            201: authModel.authResponse,
        }
    })






