import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema.js";

const connectionString =
  process.env.DATABASE_URL ?? "postgres://spec_forge:spec_forge@localhost:5433/spec_forge";

const queryClient = postgres(connectionString);

export const db = drizzle(queryClient, { schema });
export type Database = typeof db;
