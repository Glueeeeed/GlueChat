import {Elysia, status} from "elysia";
import {bearer} from "@elysiajs/bearer";
import {jwt} from "@elysiajs/jwt";
import {accountData} from "./model";
import AccountService, {TwoFactorData} from "./service";
import {AuthService} from "../auth/service";
import {AlreadyExistsError, InvalidCredentialsError, InvalidDataFormatError, NotFoundError} from "../../utils/exceptions";
import {Logger} from "../../utils/logger";

export const account = new Elysia({ prefix: '/account' })
    .use(bearer())
    .use(jwt({ name: 'jwt',
        secret: process.env.JWT_SECRET!
    }))
    .derive(async ({ jwt, bearer, set }) => {
        if (!bearer) {
            set.status = 401
            throw new Error('Unauthorized: No token provided')
        }

        Logger.log(bearer);

        const payload = await jwt.verify(bearer);
        if (!payload) {
            set.status = 401
            throw new Error('Unauthorized: Invalid token')
        }

        return {
            user: payload as { id: string } & typeof payload        }
    })

    .post('/change-password', async ({body, user}) => {
        try {
            const {oldPassword, newPassword} = body;
            AuthService.validate("validatePass", newPassword, true);
            const isValid : boolean = await AccountService.checkCurrentPass(user.id, oldPassword, newPassword);

            if (!isValid) {
                throw new InvalidCredentialsError("Current password is invalid");
            } else {
                await AccountService.changePass(user.id, newPassword);
            }

            return status(200, {
                success: true,
                message: 'Password changed successfully.'
            });
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
                message: "Something went wrong"
            })
        }
    }, {
        body: accountData.changePassData,
        response: {
            201: accountData.response
        }
    })


    .get('/2fa/setup', async ({user}) => {
        try {
           const data : TwoFactorData =  await AccountService.generateSecret2FA(user.id);
           return status(200, {
               success: true,
               message: "Successfully generated 2fa secret",
               twoFactorUrl: data.url,
               twoFactorSecret: data.secret,
           })

        } catch (e) {
            Logger.error(e);
            return status(500, {
                success: false,
                message: "Something went wrong"
            })
        }
    }, {
        response: {
            201: accountData.response
        }
    })

    .post('/2fa/verify', async ({body, user}) => {
       try {
           const {code} = body;
           await AccountService.verify2FA(user.id , code);
           return status(200, {
               success: true,
               message: "Successfully verified"
           })

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
               message: "Something went wrong"
           })
       }
    }, {
        body: accountData.twoFactorData,
        response: {
            201: accountData.response
        }
    })

    .get('/2fa/status', async ({user}) => {
        try {
            const {enabled} = await AccountService.get2FAStatus(user.id);
            return {
                success: true,
                message: "Status fetched successfully",
                enabled
            }
        } catch (e) {
            Logger.error(e);
            return status(500, {
                success: false,
                message: "Something went wrong"
            })
        }
    }, {
        response: {
            201: accountData.response
        }
    })

    .get('/recovery/status', async ({user}) => {
        try {
            const {enabled} = await AccountService.getRecoveryStatus(user.id);
            return {
                success: true,
                message: "Status fetched successfully",
                enabled
            }
        } catch (e) {
            Logger.error(e);
            return status(500, {
                success: false,
                message: "Something went wrong"
            })
        }
    })

    .get('/2fa/disable', async ({user}) => {
        try {
            await AccountService.disable2FA(user.id);
            return status(200, {
                success: true,
                message: "Disabled 2fa successfully",
            })
        } catch (e) {
            Logger.error(e);
            return status(500, {
                success: false,
                message: "Something went wrong"
            })
        }
    }, {
        response: {
            201: accountData.response
        }
    })

    .get('/recovery/remove', async ({user}) => {
        try {
            await AccountService.removeRecovery(user.id);
            return status(200, {
                success: true,
                message: "Removed recovery successfully",
            })
        } catch (e) {
            Logger.error(e);
            return status(500, {
                success: false,
                message: "Something went wrong"
            })
        }
    }, {
        response: {
            201: accountData.response
        }
    })

    .post('/recovery/setup', async ({body, user}) => {
        try {
            const {email} = body;
            await AccountService.setupRecovery(user.id, email);
            return status(200, {
                success: true,
                message: "Successfully sent verification email",
            })

        } catch (e) {
            Logger.error(e);
            return status(500, {
                success: false,
                message: "Something went wrong"
            })
        }
    }, {
        body: accountData.recoverySetupData,
        response: {
            201: accountData.response
        }
    })


    .post('/recovery/setup/verify', async ({body, user}) => {
        try {
            const {email, code} = body;
            if (!code) {
                throw new InvalidDataFormatError("Code is required");
            }
             await AccountService.verifySetupRecovery(user.id, code,email);
            return status(200, {
                success: true,
                message: "Successfully enabled account recovery",
            })
        } catch (e) {
            if (e instanceof InvalidDataFormatError  || e instanceof InvalidCredentialsError || e instanceof AlreadyExistsError) {
                return status(e.statusCode, {
                    success: false,
                    message: e.message
                })
            }
            Logger.error(e);
            return status(500, {
                success: false,
                message: "Something went wrong"
            })
        }
    },{
        body: accountData.recoverySetupData,
        response: {
            201: accountData.response
        }
    })


    .post('/register-device', async ({body, user}) => {
        try {
            const {deviceId, keys} = body;
            await AccountService.registerDevice(deviceId,user.id,  keys);
            return status(200, {
                success: true,
                message: "Successfully registered device",
            })
        } catch (e) {
            if (e instanceof AlreadyExistsError) {
                return status(e.statusCode, {
                    success: false,
                    message: e.message
                })
            }
            Logger.error(e);
            return status(500, {
                success: false,
                message: "Something went wrong"
            })
        }
    }, {
        body: accountData.registerDevice,
        response: {
            201: accountData.response
        }
    })

    .post('/reset-keys', async ({body, user}) => {
        try {
            const {deviceId} = body;
            await AccountService.resetDeviceKeys(deviceId, user.id);
            return(200);
        } catch (e) {
            Logger.error(e);
            return status(500, {
                success: false,
                message: "Something went wrong"
            })

        }
    } , {
        body: accountData.resetDevice
    })

    .post('/check-device', async ({body, user}) => {
        try {
            const {deviceId} = body;
            const isRegistered : boolean = await AccountService.checkDeviceIsRegistered(deviceId, user.id);
            return status(200, {
                success: true,
                isRegistered,
            })

        } catch (e) {
            Logger.error(e);
            return status(500, {
                success: false,
                message: "Something went wrong"
            })
        }
    }, {
        body: accountData.resetDevice
    })