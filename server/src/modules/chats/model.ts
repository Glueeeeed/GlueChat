import { t } from "elysia";

export const chatsModel = {
    chatInfoResponse: t.Object({
        success: t.Boolean(),
        message: t.String(),
        data: t.Optional(
            t.Object({
                id: t.String(),
                name: t.String(),
                status: t.String(),
                unread: t.Boolean(),
                unreadCount: t.Number(),
                publicKey: t.String(),
                senderID: t.String(),
            })
        ),
    })
}