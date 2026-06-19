import {Elysia, status} from "elysia";
import {bearer} from "@elysiajs/bearer";
import {jwt} from "@elysiajs/jwt";
import {accountData} from "./model";
import {AccountService, TwoFactorData} from "./service";
import {AuthService} from "../auth/service";
import {InvalidCredentialsError, InvalidDataFormatError} from "../../utils/exceptions";

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

        console.log(bearer)

        const payload = await jwt.verify(bearer)
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
            console.error(e);
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
            console.error(e);
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
           console.error(e);
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
            console.error(e);
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

    .post('/2fa/disable', async ({user}) => {
        try {
            await AccountService.disable2FA(user.id);
            return {
                success: true,
                message: "2FA disabled successfully"
            }
        } catch (e) {
            console.error(e);
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