import { PrismaClient } from "@prisma/client";

async function main() {
  const directUrl = "postgresql://postgres.hcxnyuuzjrjxvotjqopm:NicxProject-db@aws-1-eu-central-2.pooler.supabase.com:5432/postgres";
  console.log("Testing direct connection on port 5432...");
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: directUrl,
      },
    },
  });
  
  try {
    const course = await prisma.course.findFirst();
    console.log("✅ Direct connection SUCCESS! Course title:", course ? course.title : "None");
  } catch (err) {
    console.error("❌ Direct connection FAILED:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
