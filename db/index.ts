import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { dbStore } from "./store";

const databaseUrl = process.env.DATABASE_URL;

export const drizzleDb = databaseUrl ? drizzle(neon(databaseUrl), { schema }) : null;

export { dbStore };
export * from "./schema";
export * from "./store";
