import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

interface GlobalSetupContext {
  provide: (key: "dbUrl", value: string) => void;
}

let container: StartedPostgreSqlContainer;

export async function setup(project: GlobalSetupContext) {
  console.log("Starting shared PostgreSQL container...");
  container = await new PostgreSqlContainer("postgres:alpine").start();
  const dbUrl = container.getConnectionUri();
  project.provide("dbUrl", dbUrl);

  // Test files run in separate module registries and cannot serialize this.
  console.log("Applying migrations...");
  const db = drizzle(dbUrl);
  try {
    await migrate(db, {
      migrationsFolder: `${process.cwd()}/packages/db/src/migrations`,
    });
  } finally {
    // Left open, this pool errors when the container stops and fails the run.
    await db.$client.end();
  }

  console.log(`PostgreSQL ready at ${dbUrl}`);
}

export async function teardown() {
  console.log("Stopping shared PostgreSQL container...");
  await container?.stop();
}
