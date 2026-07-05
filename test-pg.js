const postgres = require('postgres');

const sql = postgres('postgresql://postgres:Olaportfolio%2A11@db.hcxnyuuzjrjxvotjqopm.supabase.co:5432/postgres', {
  connect_timeout: 5
});

async function run() {
  try {
    const result = await sql`SELECT 1 as connected`;
    console.log("SUCCESS:", result);
    process.exit(0);
  } catch (err) {
    console.error("FAILED:", err.message);
    process.exit(1);
  }
}
run();
