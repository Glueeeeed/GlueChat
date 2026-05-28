import {Elysia, status} from "elysia";
import { bearer } from '@elysiajs/bearer'
import { jwt } from '@elysiajs/jwt'
import {profileModel} from "./model";
import {ProfileService} from "./service";
import path from "path";

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

    .post('/update', async ({user,body}) => {
        try {
            const {avatar, banner, bannerColor, description} = body;
            await ProfileService.updateProfile(user.id,avatar,banner,description,bannerColor);
            return status(200);

        } catch (e) {
            console.error(e);
            return status(500, {
                success: false,
                message: "Something went wrong"
            })
        }
    }, {
        body: profileModel.updateProfile,
    })








