import { prisma } from "../../lib/prisma";
import * as bun from "bun";
import * as OTPAuth from "otpauth";
import * as crypto from "crypto";
import {InvalidCredentialsError, InvalidDataFormatError} from "../../utils/exceptions";
import {join} from "path";
require("dotenv").config({ path: join(__dirname, "../..env") });


export interface TwoFactorData {
    url: string,
    secret: string,
}

export abstract class AccountService {
    static decrypt(encryptedData: string): string {
        const key = process.env.ENCRYPT_KEY_2FA;
        if (!key) {
            throw new Error("Encryption key not found");
        }

        const [nonceHex, encrypted, authTagHex] = encryptedData.split(':');

        const decipher = crypto.createDecipheriv(
            "aes-256-gcm",
            Buffer.from(key, 'base64'),
            Buffer.from(nonceHex, 'hex')
        );

        decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }

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

    static async generateSecret2FA(userID: string ): Promise<TwoFactorData> {
        const user = await prisma.user.findFirst({ where: { id: userID }, select: {nickname: true} });
        if (!user) {
            throw new InvalidDataFormatError("User not found");
        }

        const secret  = new OTPAuth.Secret({size: 32});
        const totp = new OTPAuth.TOTP({
            issuer: "GlueChat",
            label: user.nickname || userID,
            algorithm: "SHA1",
            digits: 6,
            period: 30,
            secret: secret
        });

        const url = totp.toString();
        const key = process.env.ENCRYPT_KEY_2FA;
        const nonce = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(key as string, 'base64'), nonce);
        let encrypted = cipher.update(url, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');
        const dbValue = `${nonce.toString('hex')}:${encrypted}:${authTag}`;

        const secretExists = await prisma.secrets2FA.findFirst({ where: { userId: userID } });
        if (!secretExists) {
            await prisma.secrets2FA.create({
                data: {
                    userId: userID,
                    secretCode: dbValue
                }
            })
        } else {
            await prisma.secrets2FA.update({
                where: {
                    userId: userID
                },
                data: {
                    secretCode: dbValue
                }
            })
        }

        return {
            url: url,
            secret: secret.base32
        }
    }

    static async verify2FA(userID: string, code: string): Promise<void> {
        const record = await prisma.secrets2FA.findFirst({
            where: { userId: userID },
            select: { secretCode: true }
        });

        if (!record) {
            throw new InvalidDataFormatError("2FA is not set up for this user");
        }
        const decryptedUri = this.decrypt(record.secretCode);
        const totp = OTPAuth.URI.parse(decryptedUri);


        const delta = totp.validate({
            token: code,
            window: 1
        });

        if (delta === null) {
            throw new InvalidCredentialsError("Invalid verification code");
        }

        await prisma.secrets2FA.update({
            where: { userId: userID },
            data: { status: 'ACTIVE' }
        });
    }

    static async get2FAStatus(userID: string): Promise<{ enabled: boolean }> {
        const record = await prisma.secrets2FA.findFirst({
            where: { userId: userID },
            select: { status: true }
        });

        return {
            enabled: record?.status === 'ACTIVE'
        };
    }

    static async disable2FA(userID: string): Promise<void> {
        await prisma.secrets2FA.delete({
            where: { userId: userID }
        });
    }


}