import { t } from 'elysia'

export const testModel = {

    testBody: t.Object({
        id: t.Number(),
        name: t.String(),
    }),

    testResponse: t.Object({
        message: t.String(),
    })

}