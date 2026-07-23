import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const courseId = "7b2b4f08-4d10-45a5-8a52-d12dabbf65c6";
  console.log(`Testing fetch for courseId: ${courseId}...`);
  try {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        application: { select: { id: true, company: true, job_title: true } },
        progress: true,
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: { orderBy: { order: 'asc' } },
            quiz: { include: { attempts: { orderBy: { completed_at: 'desc' }, take: 1 } } },
            flashcards: { include: { ratings: { orderBy: { rated_at: 'desc' }, take: 1 } } },
          }
        }
      }
    });
    console.log("Success! Course found:", course ? course.title : "Not found");
  } catch (err) {
    console.error("❌ Prisma fetch failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
