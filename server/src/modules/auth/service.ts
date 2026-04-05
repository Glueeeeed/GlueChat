import { prisma } from "../../lib/prisma";
import {AlreadyExistsError, InvalidDataFormatError} from "../../utils/exceptions";
import validator from 'validator';

export abstract class AuthService {

    static  async checkIfNicknameExists(nickname: string): Promise<void> {
        const isExists = await prisma.user.findFirst({
            where: {
                nickname: nickname,
            }
        })
        if (isExists) {
            throw new AlreadyExistsError('Nickname already exists');
        }
    }

    static async checkIfAccountExists(email: string): Promise<void> {

        const isExists = await prisma.user.findFirst({
            where: {
                email: email
            }
        })

        if (isExists) {
            throw new AlreadyExistsError('Email already exists');
        }


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

    static validate(nickname: string, email : string , password: string) : void {

        if (validator.isEmail(nickname)) {
            throw new InvalidDataFormatError("Nickname cannot be an email address");
        }
        if (!validator.isLength(nickname, { min: 4, max: 20 })) {
            throw new InvalidDataFormatError("Nickname must be between 4 and 20 characters");
        }
        if (!validator.isAlphanumeric(nickname)) {
            throw new InvalidDataFormatError("Nickname can only contain letters and numbers");
        }

        if (!validator.isEmail(email)) {
            throw new InvalidDataFormatError("Invalid email format");
        }

        if (!validator.isLength(password, { min: 8 })) {
            throw new InvalidDataFormatError("Password must be at least 8 characters long");
        }
        if (!validator.isStrongPassword(password)) {
            throw new InvalidDataFormatError("Password is too weak (must include uppercase, lowercase, number and symbol)");
        }


    }
}