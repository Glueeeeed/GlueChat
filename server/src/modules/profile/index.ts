import {Elysia, status} from "elysia";
import { bearer } from '@elysiajs/bearer'
import { jwt } from '@elysiajs/jwt'
import {profileModel} from "./model";
import {ProfileService} from "./service";
import path from "path";
import {Logger} from "../../utils/logger";

export const profile = new Elysia({ prefix: '/profile' })
    .get('/assets/:type/:userId', async ({ params, set }) => {
       try {

           const assetPath : any =  await ProfileService.getProfileAssetsPath(params.userId, params.type);
           console.log(assetPath);
           if (!assetPath) {
               return status(404);
           }

           const filePath = path.join(process.cwd(), "uploads", assetPath) ;
           const file = Bun.file(filePath)

           const exists = await file.exists();

           if (!exists) {
               return status(404)
           }

           return file;
       } catch (e) {
           return status(404)
       }
    })

    .get('/:userId', async ({ params, set }) => {
        try {
            const profileData = await ProfileService.getProfile(params.userId);
            if (!profileData) {
                set.status = 404;
                return { success: false, message: "Profile not found" };
            }
            return profileData;
        } catch (e) {
            Logger.error(e);
            return status(500, {
                    success: false,
                    message: "Failed to get user profile"
                });
        }
    })
    .use(bearer())
    .use(jwt({ name: 'jwt',
        secret: process.env.JWT_SECRET!
    }))
    .derive(async ({ jwt, bearer, set }) => {
        if (!bearer) {
            set.status = 401
            throw new Error('Unauthorized: No token provided')
        }

        const payload = await jwt.verify(bearer)
        if (!payload) {
            set.status = 401
            throw new Error('Unauthorized: Invalid token')
        }

        return {
            user: payload as { id: string } & typeof payload        }
    })

    .get('/me', async ({ user }) => {
        try {
            const profileData = await ProfileService.getProfile(user.id);
            return profileData;
        } catch (e) {
            Logger.error(e);
            return status(500, { message: "Failed to get user profile" });
        }
    })
    .post('/update', async ({ user, body }) => {
        try {
            const { avatar, banner, bannerColor, description } = body;
            await ProfileService.updateProfile(user.id, avatar, banner, description, bannerColor);
            return { success: true, message: "Successfully updated profile" };
        } catch (e: any) {
            Logger.error(e);
            return status(500, {
                success: false,
                message: "Something went wrong"
            })
        }
    }, {
        body: profileModel.updateProfile,
    })


    .delete('/assets/:type/:userId', async ({ params, set }) => {
        try {

            const assetPath : any =  await ProfileService.getProfileAssetsPath(params.userId, params.type);
            await ProfileService.handleRemove(params.type, params.userId);
            if (!assetPath) {
                return status(404);
            }

            const filePath = path.join(process.cwd(), "uploads", assetPath) ;
            const file = Bun.file(filePath)
            await file.delete();
            return status(200, { success:true, message: "Successfully deleted profile",  });
        } catch (e) {
            Logger.log(e);
            return status(404)
        }
    })








