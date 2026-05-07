import { prisma } from "../../lib/prisma";
import {AlreadyExistsError, InvalidCredentialsError, InvalidDataFormatError} from "../../utils/exceptions";
import validator from 'validator';
import {isForbiddenNick} from "../../utils/validation";

interface UserData {
    password: string;
    id: string;
}

interface OneTimeKey {
    id: string;
    pubKey: string;
}

interface RegistrationKeys {
    identityPubKey: string;
    spkPubKey: string;
    signature: string;
    oneTimeKeys: OneTimeKey[];
}

export abstract class AuthService {

    static  async checkIfNicknameExists(nickname: string,loginOption: boolean): Promise<void> {
        const isExists = await prisma.user.findFirst({
            where: {
                nickname: nickname,
            }
        })
        if (!loginOption) {
            if (isExists) {
                throw new AlreadyExistsError('Nickname already exists');
            }
        } else {
            if (!isExists) {
                throw new InvalidCredentialsError("Invalid password or nickname");
            }
        }
    }





    static async registerUser(nickname: string , password: string, keys : string): Promise<void> {
        const passwordHash = await Bun.password.hash(password);

        const parsedKey : RegistrationKeys = JSON.parse(keys);
        const {identityPubKey, spkPubKey, signature, oneTimeKeys} = parsedKey;


        await prisma.$transaction(async (t) => {
            const user = await t.user.create({
                data: {
                    nickname: nickname,
                    password: passwordHash,
                }
            })

            await t.identityKeys.create({
                data: {
                    userID: user.id,
                    identityKey: identityPubKey,
                }
            })

            await t.signedPreKeys.create({
                data: {
                    userID: user.id,
                    signedPubKey: spkPubKey,
                    signature: signature,
                }
            })

            if (oneTimeKeys && oneTimeKeys.length > 0) {
                await t.oneTimePreKeys.createMany({
                    data: oneTimeKeys.map(key => ({
                        userId: user.id,
                        keyId: key.id,
                        publicKey: key.pubKey
                    }))
                });
            }


        })

        console.log("Registered user with nickname", nickname)

    }


    static async loginUser(nickname: string, password: string): Promise<string> {


        const userPasswordHash : UserData | null = await prisma.user.findFirst({
            where: {
                nickname: nickname
            },
            select: {
                password: true,
                id: true
            }
        })

        if (!userPasswordHash) {
            throw new Error("errr");
        }
        const isValid = await Bun.password.verify(password, userPasswordHash.password as string);
        if (!isValid) {
            throw new InvalidCredentialsError("Invalid password or nickname");
        }
        return userPasswordHash.id;

    }

    static validate(nickname: string , password: string, isLogin : boolean) : void {

        if (validator.isEmail(nickname as string)) {
            throw new InvalidDataFormatError("Nickname cannot be an email address");
        }
        if (!validator.isLength(nickname as string, { min: 4, max: 20 })) {
            throw new InvalidDataFormatError("Nickname must be between 4 and 20 characters");
        }
        if (!validator.isAlphanumeric(nickname as string)) {
            throw new InvalidDataFormatError("Nickname can only contain letters and numbers");
        }

        if (!isLogin) {
            if (isForbiddenNick(nickname)) {
                throw new InvalidDataFormatError("This nickname is not allowed");
            }
        }




        if (!validator.isLength(password, { min: 8, max: 32 })) {
            throw new InvalidDataFormatError("Password must be between 8 and 32 characters long.");
        }
        if (!validator.isStrongPassword(password)) {
            throw new InvalidDataFormatError("Password is too weak (must include uppercase, lowercase, number and symbol)");
        }


    }
}