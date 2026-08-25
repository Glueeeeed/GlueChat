import {prisma} from "../../../lib/prisma";
import {activeConnections} from "../../../app";

export interface Stats  {
    registeredUsers: number;
    activeUsers: number;
}

export interface User {
    users: {
        id: string;
        nickname: string;
        createdAt: Date;
    }[],
}

export abstract class PanelApiService {

    static async getStats() : Promise<Stats> {
        const registeredUsers : number = await prisma.user.count();
        const activeUsers : number =  activeConnections.size;
        return {
            registeredUsers,
            activeUsers
        }

    }

    static async getUsers() : Promise<User> {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                nickname: true,
                createdAt: true,
            },
        })


        return {
            users
        }
    }
}