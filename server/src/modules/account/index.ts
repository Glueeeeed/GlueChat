import {Elysia, status} from "elysia";
import {bearer} from "@elysiajs/bearer";
import {jwt} from "@elysiajs/jwt";
import {accountData} from "./model";
import {AccountService} from "./service";
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