import {Elysia,status} from "elysia";
import {join} from "path";
require("dotenv").config({ path: join(__dirname, "../..env") });


export const gluechat = new Elysia({ prefix: '/app' })


    .get('/version', () => {
        const version = process.env.VERSION || "";
        return status(200, version)
    })






