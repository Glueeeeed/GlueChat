import {prismaClient} from "../../utils/db";

export abstract class AuthService {



    static  async checkIfNicknameExists(nickname: string): Promise<boolean> {
        const isExists = await prismaClient.users.findFirst({
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

        const isExists = await prismaClient.users.findFirst({
            where: {
                email: email
            }
        })

        if (isExists) {
            return true;
        }

        return false;
    }

    static async registerUser(nickname: string , email: string , password: string): Promise<void> {

        const passwordHash = await Bun.password.hash(password);


        await prismaClient.users.create({
            data: {
                nickname: nickname,
                email: email,
                password: passwordHash
            }
        })

        console.log("Registered user with nickname", nickname)

    }
}