import {t} from "elysia";

export const authModel = {


    authBody: t.Object({
        nickname: t.String(),
        password: t.String(),
        accessCode: t.Optional(
            t.String(),
        ),
        keys: t.Optional(
            t.String(),
        ),
        code2fa: t.Optional(
            t.String(),
        ),
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
        mfaRequired: t.Optional(
            t.Boolean(),
        ),
    }),

    refreshBody: t.Object({
        refreshToken: t.String(),
    })

}