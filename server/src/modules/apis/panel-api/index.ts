import {Elysia, status} from "elysia";
import {bearer} from "@elysiajs/bearer";
import {Logger} from "../../../utils/logger";
import {PanelApiService, Stats, User} from "./service";

export const panelApi = new Elysia({ prefix: '/internal' })
    .use(bearer())
    .derive(async ({ bearer, set }) => {
        if (!bearer) {
            set.status = 401
            throw new Error('Unauthorized: No token provided')
        }

        if (bearer !== process.env.INTERNAL_API_KEY!) {
            set.status = 401;
            return { success: false, message: 'Unauthorized' };
        }
    })



    .get('/stats', async () => {
        try {
            const stats : Stats = await PanelApiService.getStats();
            return status(200, {
                success: true,
                message: 'Get stats successfully',
                data: {
                    registeredUsers: stats.registeredUsers,
                    activeUsers: stats.activeUsers,
                }
            })


        } catch (e) {
            Logger.error(e);
            return status(500, {
                success: false,
                message: 'Something went wrong'
            })
        }
    })

    .get('/users', async () => {
        try {
            const data : User  =  await  PanelApiService.getUsers();
            return status(200, {
                success: true,
                message: 'Get users successfully',
                data
            })

        } catch (e) {
            Logger.error(e);
            return status(500, {
                success: false,
                message: 'Something went wrong'
            })
        }
    })