import {t} from "elysia";

export const authModel = {


    authBody: t.Object({
        nickname: t.Optional(
            t.String(),
        ),
        email: t.String(),
        password: t.String(),

    }),

    authResponse: t.Object({
        success: t.Boolean(),
        message: t.String(),
        authToken: t.Optional(
            t.String(),
        ),
        refreshToken: t.Optional(
            t.String(),
        ),
    })

}