import {t} from "elysia";

export const friendsModel = {



    addFriendBody: t.Object({
        nickname: t.String()
    }),

    responseBody: t.Object({
        success: t.Boolean(),
        message: t.String(),
    })

}