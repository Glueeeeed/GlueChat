import {t} from "elysia";

export const friendsModel = {



    addFriendBody: t.Object({
        nickname: t.String()
    }),

    responseBody: t.Object({
        success: t.Boolean(),
        message: t.String(),
        data: t.Optional(
            t.Object({
                nickname: t.String(),
                id: t.Number(),
            })
        )
    })

}