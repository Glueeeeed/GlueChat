import {t} from "elysia";

export const accountData = {
    changePassData: t.Object({
        oldPassword: t.String(),
        newPassword: t.String(),
    }),

    twoFactorData: t.Object({
        code: t.String()
    }),

    response: t.Object({
        success: t.Boolean(),
        message: t.String(),
        twoFactorUrl: t.Optional(
            t.String()
        ),
        twoFactorSecret: t.Optional(
            t.String()
        ),
        enabled: t.Optional(t.Boolean())
    })
}