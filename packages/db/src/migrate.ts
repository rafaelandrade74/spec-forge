import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const connectionString =
  process.env.DATABASE_URL ?? "postgres://spec_forge:spec_forge@localhost:5433/spec_forge";

async function main() {
  const migrationClient = postgres(connectionString, { max: 1 });
  const db = drizzle(migrationClient);
  await migrate(db, { migrationsFolder: "./drizzle" });
  await migrationClient.end();
  console.log("Migrations applied.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
