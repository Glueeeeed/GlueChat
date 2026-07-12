import {t} from "elysia";

export const e2eeModel = {

    response: t.Object({
        success: t.Boolean(),
        message: t.String(),
        spk: t.Optional(
            t.String(),
        ),
        opk: t.Optional(
            t.String(),
        )
    }),

    request: t.Object({
        id: t.String(),
    }),

    query: t.Object({
        userId: t.String(),
        deviceId: t.Optional(t.String()),
    })

}