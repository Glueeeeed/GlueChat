import { prisma } from "../../lib/prisma";
import {AlreadyExistsError, InvalidCredentialsError, InvalidDataFormatError} from "../../utils/exceptions";
import validator from 'validator';
import * as OTPAuth from "otpauth";
import {isForbiddenNick} from "../../utils/validation";
import {randomBytes} from "node:crypto";
import AccountService from "../account/service";
import {join} from "path";
import * as bun from "bun";
import * as jwtLib from 'jsonwebtoken';
import {render} from "@react-email/render";
import * as React from "react";
import OTPEmail from "../../emails/otp";
import Recovery from "../../emails/recovery";
import {transporter} from "../../utils/nodemailer";
require("dotenv").config({ path: join(__dirname, "../../../.env") });


interface UserData {
    password: string;
    id: string;
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


    private static async verifyAccessToken(accessToken : string): Promise<void> {
        const exist = await prisma.accessCodes.findFirst({
            where: {
                AND: {
                    code: accessToken,
                    isUsed: false
                }
            }
        })
        if (!exist) {
            throw new InvalidCredentialsError("Access token not found");
        }
    }



    static async registerUser(nickname: string , password: string, accessCode: string): Promise<string | void> {
        const passwordHash = await Bun.password.hash(password);


        await this.verifyAccessToken(accessCode);

        await prisma.accessCodes.update({
            where: {
                code: accessCode
            },
            data: {
                isUsed: true,
            }
        })

        await prisma.$transaction(async (t) => {
             await t.user.create({
                data: {
                    nickname: nickname,
                    password: passwordHash,
                    betaTester: true
                }
            })

        })

        const id = await prisma.user.findFirst({
            where: {
                nickname: nickname
            },
            select: {
                id: true
            }
        })

        if (id) {
            return id.id;
        }
        return;

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

    static async is2FAEnabled(userID: string): Promise<boolean> {
        const record = await prisma.secrets2FA.findFirst({
            where: { userId: userID },
            select: { status: true }
        });
        return record?.status === 'ACTIVE';
    }

    static async verify2FACode(userID: string, code: string): Promise<boolean> {
        const record = await prisma.secrets2FA.findFirst({
            where: { userId: userID },
            select: { secretCode: true }
        });

        if (!record) return false;

        const decryptedUri = AccountService.decrypt(record.secretCode);
        const totp = OTPAuth.URI.parse(decryptedUri);
        const delta = totp.validate({
            token: code,
            window: 1
        });

        return delta !== null;
    }

    static async generateAccessCode() : Promise<string> {
        const accessCode : string = Buffer.from(randomBytes(6)).toString("base64url");
        await prisma.accessCodes.create({
            data: {
                code : accessCode
            }
        })
        return accessCode;
    }

    static validate(nickname: string , password: string, isLogin : boolean) : void {

        if (validator.isEmail(nickname as string)) {
            throw new InvalidDataFormatError("Nickname cannot be an email address");
        }
        if (!validator.isLength(nickname as string, { min: 3, max: 20 })) {
            throw new InvalidDataFormatError("Nickname must be between 3 and 20 characters");
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

    static async resetPasswordRequest(email : string) : Promise<void> {
        const hasher = new bun.CryptoHasher('sha512', process.env.HMAC_KEY);
        hasher.update(email);
        const hashedEmail : string = hasher.digest('base64');
        const record = await prisma.user.findFirst({
            where: {
                resetEmail: hashedEmail
            },
            select: {
                id: true,
                nickname: true
            }
        })
        if (!record) {
            console.log('not found associated email with account. abort');
            return;
        }

        const sessionId = randomBytes(5).toString("hex");

        const token  = jwtLib.sign(
            {id: record.id, session: sessionId},
            process.env.RECOVERY_SECRET as string,
            {expiresIn: '10m'}
        )

        await prisma.recoverySessions.create({
            data: {
                userId: record.id,
                sessionId: sessionId
            }
        })

        const url = `${process.env.BASE_URL}/api/auth/reset-password/${token}`;

        const html : string = await render(
            React.createElement(Recovery, { url: url, nickname: record.nickname })
        );

        await transporter.sendMail({
            from: process.env.MAIL_USER,
            to: email,
            subject: "DON'T REPLY | ACCOUNT RECOVERY",
            html: html
        });


    }

    static async resetPassword(userID: string, sessionID: string , password: string, repeatPassword: string) : Promise<void> {
        if (password !== repeatPassword) {
            throw new InvalidDataFormatError("Passwords don't match");
        }
        if (!validator.isLength(password, { min: 8, max: 32 })) {
            throw new InvalidDataFormatError("Password must be between 8 and 32 characters long.");
        }
        if (!validator.isStrongPassword(password)) {
            throw new InvalidDataFormatError("Password is too weak (must include uppercase, lowercase, number and symbol)");
        }

        const hashedPassword = await bun.password.hash(password);

        await prisma.recoverySessions.update({
            where: {
                sessionId: sessionID
            },
            data: {
                isUsed: true
            }
        })

        await prisma.user.update({
            where: {
                id: userID
            },
            data: {
                password: hashedPassword
            }
        })


    }

}