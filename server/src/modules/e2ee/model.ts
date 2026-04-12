import {t} from "elysia";

export const e2eeModel = {

    response: t.Object({
        success: t.Boolean(),
        message: t.String(),
        publicKey: t.Optional(
            t.String(),
        )
    })

}