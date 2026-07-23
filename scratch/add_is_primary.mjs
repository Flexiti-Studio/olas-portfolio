// Script to add is_primary column to social_templates via raw SQL
// Run with: node scratch/add_is_primary.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Adding is_primary column to social_templates...");
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE social_templates 
      ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT false;
    `);
    console.log("✅ Column added successfully.");
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
