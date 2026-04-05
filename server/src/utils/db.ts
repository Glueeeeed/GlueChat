import { PrismaClient } from "../generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const adapter = new PrismaMariaDb({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    port: 3306,

    allowPublicKeyRetrieval: true,
    ssl: {
        rejectUnauthorized: false
    },
    connectTimeout: 10000,
    connectionLimit: 5,
});
export const prismaClient = new PrismaClient({ adapter });