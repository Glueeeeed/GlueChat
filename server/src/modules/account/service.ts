import { prisma } from "../../lib/prisma";
import * as bun from "bun";
import {InvalidDataFormatError} from "../../utils/exceptions";

export abstract class AccountService {
    static async checkCurrentPass(userID: string ,currentPassword: string, newPassword : string): Promise<boolean> {
        if (currentPassword === newPassword) {
            throw new InvalidDataFormatError("New password can't be the same as the current one")
        }
        const pass = await prisma.user.findFirst({ where: { id: userID }, select: {password: true} });
        if (!pass) {
            return false;
        }
        return await  bun.password.verify(currentPassword, pass.password);
    }

    static async changePass(userID: string, newPassword: string): Promise<void> {
        const hash : string = await bun.password.hash(newPassword);
        await prisma.user.update({
            where: {
                id: userID
            },
            data: {
                password: hash
            }
        })
    }


}