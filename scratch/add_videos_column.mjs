import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Adding videos column to CreatorProject...");
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "CreatorProject" 
      ADD COLUMN IF NOT EXISTS videos JSONB DEFAULT '[]';
    `);
    console.log("✅ Column added successfully.");
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
