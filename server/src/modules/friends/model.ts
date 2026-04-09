import {t} from "elysia";

export const friendsModel = {



    addFriendBody: t.Object({
        nickname: t.String()
    }),

    manageRequestBody: t.Object({
        requestID: t.String(),
        accept: t.Boolean(),
    }),

    responseBody: t.Object({
        success: t.Boolean(),
        message: t.Optional(
            t.String(),
        ),
        data: t.Optional(
            t.Object({
                nickname: t.String(),
                id: t.Number(),
                status: t.Optional(
                    t.String(),
                ),
            })
        )
    })

}