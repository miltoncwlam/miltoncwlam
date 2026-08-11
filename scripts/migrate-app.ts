import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
});

async function migrate() {
  const migrationsDir = join(process.cwd(), "supabase/migrations");
  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  await pool.query(
    `create table if not exists app_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )`,
  );

  for (const file of files) {
    const applied = await pool.query<{ exists: boolean }>(
      "select exists(select 1 from app_migrations where name = $1) as exists",
      [file],
    );

    if (applied.rows[0]?.exists) continue;

    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query(readFileSync(join(migrationsDir, file), "utf8"));
      await client.query("insert into app_migrations(name) values ($1)", [file]);
      await client.query("commit");
      console.log(`Applied ${file}`);
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  console.log("App migrations completed.");
  await pool.end();
}

migrate().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
