import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";

interface GlobalSetupContext {
  provide: (key: "dbUrl", value: string) => void;
}

let container: StartedPostgreSqlContainer;

export async function setup(project: GlobalSetupContext) {
  console.log("Starting shared PostgreSQL container...");
  container = await new PostgreSqlContainer("postgres:alpine").start();
  const dbUrl = container.getConnectionUri();
  project.provide("dbUrl", dbUrl);
  console.log(`PostgreSQL ready at ${dbUrl}`);
}

export async function teardown() {
  console.log("Stopping shared PostgreSQL container...");
  await container?.stop();
}
