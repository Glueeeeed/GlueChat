import { prisma } from "../../lib/prisma";
import {AlreadyExistsError, InvalidCredentialsError, InvalidDataFormatError, NotFoundError} from "../../utils/exceptions";
import validator from 'validator';

interface UserData {
    password: string;
}

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

    static async checkIfAccountExists(email: string, loginOption: boolean): Promise<void> {

        const isExists = await prisma.user.findFirst({
            where: {
                email: email
            }
        })

        if (!loginOption) {
            if (isExists) {
                throw new AlreadyExistsError('Email already exists');
            }
        } else {
            if (!isExists) {
                throw new NotFoundError('Account not found');
            }
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


    static async loginUser(email: string, password: string): Promise<void> {


        const userPasswordHash : UserData | null = await prisma.user.findFirst({
            where: {
                email: email
            },
            select: {
                password: true
            }
        })

        if (!userPasswordHash) {
            throw new Error("errr");
        }
        const isValid = await Bun.password.verify(password, userPasswordHash.password as string);
        if (!isValid) {
            throw new InvalidCredentialsError("Invalid password or email");
        } else {
            console.log(isValid);
        }

    }

    static validate(nickname: string|null , email : string , password: string) : void {


        if (nickname != null) {
            if (validator.isEmail(nickname as string)) {
                throw new InvalidDataFormatError("Nickname cannot be an email address");
            }
            if (!validator.isLength(nickname as string, { min: 4, max: 20 })) {
                throw new InvalidDataFormatError("Nickname must be between 4 and 20 characters");
            }
            if (!validator.isAlphanumeric(nickname as string)) {
                throw new InvalidDataFormatError("Nickname can only contain letters and numbers");
            }
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