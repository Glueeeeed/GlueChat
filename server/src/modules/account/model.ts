import {t} from "elysia";

export const accountData = {
    changePassData: t.Object({
        oldPassword: t.String(),
        newPassword: t.String(),
    }),

    response: t.Object({
        success: t.Boolean(),
        message: t.String(),
    })
}