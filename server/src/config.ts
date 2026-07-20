import {join} from "path";
require("dotenv").config({ path: join(__dirname, "../..env") });

export const DEBUG_MODE = process.env.DEBUG_MODE === 'true';
export const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL