import * as jwtLib from 'jsonwebtoken';
import * as crypto from 'crypto';
import { prisma } from "../lib/prisma";
import {AlreadyExistsError} from "./exceptions";



export async function generateRefreshToken(userID: string) : Promise<string> {
    const sessionID = crypto.randomBytes(16).toString('base64');
    await prisma.sessions.create({
        data: {
            sessionID: sessionID,
            userID: userID,
        }
    })
    return jwtLib.sign(
        {id: userID, sessionID: sessionID},
        process.env.JWT_SECRET as string,
        {expiresIn: '7d'}
    )
}

export async function verifyRefreshToken(token: string): Promise<string | undefined> {
    try {
        const decoded: any = jwtLib.verify(token, process.env.JWT_SECRET as string);
        const sessionID = decoded.sessionID;


        const session = await prisma.sessions.findFirst({
            where: { sessionID: sessionID },
            select: { userID: true }
        });

        if (!session) {
            throw new Error("Session expired or already used");
        }

        try {
            await prisma.sessions.delete({
                where: { sessionID: sessionID }
            });
        } catch (e) {
            console.warn("Session already deleted or concurrent request handled it.");
        }

        return session.userID;


    } catch (e) {
        throw new Error("Refresh token is invalid or expired.");

    }
}




export  function generateAuthToken(id : string) {
    return jwtLib.sign(
        {id: id},
        process.env.JWT_SECRET as string,
        {expiresIn: '1h'}
    )
}
