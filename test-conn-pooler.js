const postgres = require('postgres');

async function test(url, label) {
  const sql = postgres(url, { connect_timeout: 5 });
  try {
    const res = await sql`SELECT 1 as connected`;
    console.log(`[SUCCESS] ${label}`);
    await sql.end();
  } catch (e) {
    console.log(`[FAILED] ${label}: ${e.message}`);
    try { await sql.end(); } catch {}
  }
}

async function main() {
  await test("postgresql://postgres.hcxnyuuzjrjxvotjqopm:NicxProject-db@aws-1-eu-central-2.pooler.supabase.com:6543/postgres", "aws-1 with NicxProject-db");
  await test("postgresql://postgres.hcxnyuuzjrjxvotjqopm:Olaportfolio%2A11@aws-1-eu-central-2.pooler.supabase.com:6543/postgres", "aws-1 with Olaportfolio*11");
  await test("postgresql://postgres.hcxnyuuzjrjxvotjqopm:NicxProject-db@aws-1-eu-central-2.pooler.supabase.com:5432/postgres", "aws-1 5432 with NicxProject-db");
  await test("postgresql://postgres.hcxnyuuzjrjxvotjqopm:Olaportfolio%2A11@aws-1-eu-central-2.pooler.supabase.com:5432/postgres", "aws-1 5432 with Olaportfolio*11");
}
main();
