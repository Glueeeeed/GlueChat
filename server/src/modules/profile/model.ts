import { z } from 'zod'
import { fileType } from "elysia"

export const profileModel = {
    updateProfile: z.object({
        avatar: z.optional(
            z.file()
                .max(2 * 1024 * 1024, { message: "Avatar cannot be greater than 2MB" })
                .refine((file) => fileType(file, ['image/gif', 'image/png', 'image/jpeg', 'image/avif']), {
                    message: "Avatar must be (gif, png, jpeg, avif)"
                }),
        ),


        banner: z.optional(
            z.file()
                .max(2 * 1024 * 1024, { message: "Banner cannot be greater than 2MB" })
                .refine((file) => fileType(file, ['image/gif', 'image/png', 'image/jpeg', 'image/avif']), {
                    message: "Banner must be (gif, png, jpeg, avif)"
                }),
        ),

        bannerColor: z.optional(
            z.string()
        ),


        description: z.string()
            .max(180, "Description cannot be least than 180 characters")

    }),

    avatarQuery: z.object({
        type: z.enum({avatar: 'avatar', banner: 'banner'}),
        userId: z.string()
    })
}