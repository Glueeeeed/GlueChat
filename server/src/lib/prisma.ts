import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client";
import { join } from "path";
require("dotenv").config({ path: join(__dirname, "../.env") });

console.log(process.env.DATABASE_URL, process.env.DATABASE_NAME, process.env.DATABASE_USER, process.env.DATABASE_PASSWORD, process.env.DATABASE_PORT);
const adapter = new PrismaMariaDb({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    port: Number(process.env.DATABASE_PORT) || 3306,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    connectionLimit: 10,
});
const prisma = new PrismaClient({ adapter });

export { prisma };