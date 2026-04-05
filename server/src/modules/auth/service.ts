import { prisma } from "../../lib/prisma";

export abstract class AuthService {

    static  async checkIfNicknameExists(nickname: string): Promise<boolean> {
        const isExists = await prisma.user.findFirst({
            where: {
                nickname: nickname,
            }
        })
        if (isExists) {
            return true;
        }

        return false;
    }

    static async checkIfAccountExists(email: string): Promise<boolean> {

        const isExists = await prisma.user.findFirst({
            where: {
                email: email
            }
        })

        console.log(isExists);

        if (isExists) {
            return true;
        }

        return false;
    }

    static async registerUser(nickname: string , email: string , password: string): Promise<void> {

        const passwordHash = await Bun.password.hash(password);


        await prisma.user.create({
            data: {
                nickname: nickname,
                email: email,
                password: passwordHash
            }
        })

        console.log("Registered user with nickname", nickname)

    }
}