import { Pool } from "pg";

import { hashPassword } from "better-auth/crypto";

async function main() {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (!email || !password) {
    console.log("Skip admin bootstrap (ADMIN_BOOTSTRAP_EMAIL/PASSWORD unset).");
    return;
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  try {
    const existingByEmail = await pool.query<{ id: string }>(
      `select id from "user" where lower(email) = $1 limit 1`,
      [email],
    );
    const existingAdmin = existingByEmail.rows[0]
      ? null
      : await pool.query<{ id: string }>(
          `select id from "user" where role = 'admin' order by "createdAt" asc limit 1`,
        );

    let userId = existingByEmail.rows[0]?.id ?? existingAdmin?.rows[0]?.id;
    const hashed = await hashPassword(password);
    const now = new Date();

    if (!userId) {
      userId = crypto.randomUUID();
      await pool.query(
        `insert into "user" (id, name, email, "emailVerified", "createdAt", "updatedAt", role)
         values ($1, $2, $3, true, $4, $4, 'admin')`,
        [userId, "Admin", email, now],
      );
      await pool.query(
        `insert into account (
           id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt"
         ) values ($1, $2, 'credential', $3, $4, $5, $5)`,
        [crypto.randomUUID(), userId, userId, hashed, now],
      );
      console.log(`Created bootstrap admin ${email}`);
    } else {
      await pool.query(
        `update "user"
         set email = $2, role = 'admin', "emailVerified" = true, "updatedAt" = $3
         where id = $1`,
        [userId, email, now],
      );
      const account = await pool.query<{ id: string }>(
        `select id from account
         where "userId" = $1 and "providerId" = 'credential'
         limit 1`,
        [userId],
      );
      if (account.rows[0]) {
        await pool.query(
          `update account set password = $2, "updatedAt" = $3 where id = $1`,
          [account.rows[0].id, hashed, now],
        );
      } else {
        await pool.query(
          `insert into account (
             id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt"
           ) values ($1, $2, 'credential', $3, $4, $5, $5)`,
          [crypto.randomUUID(), userId, userId, hashed, now],
        );
      }
      console.log(`Updated bootstrap admin ${email}`);
    }

    await pool.query(
      `insert into user_credits (
         user_id, balance, period_start, period_end, period_grant, is_unlimited
       ) values (
         $1, 100, date_trunc('week', now()), date_trunc('week', now()) + interval '7 days',
         100, true
       )
       on conflict (user_id) do update
       set is_unlimited = true, updated_at = now()`,
      [userId],
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Admin bootstrap failed:", error);
  process.exit(1);
});
