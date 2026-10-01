import { PrismaClient } from "@prisma/client";
import { Resend } from "resend";
import { renderDigest } from "./renderDigest";

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendDigest() {
  try {
    // Get today's start and end date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Query today's NewsEvent rows, sorted by score descending, top 10
    const events = await prisma.newsEvent.findMany({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      orderBy: {
        score: "desc",
      },
      take: 10,
    });

    if (events.length === 0) {
      console.log("No news events found for today. Skipping email digest.");
      return { success: true, message: "No events to send" };
    }

    const html = renderDigest(events);
    const highestEvent = events[0];
    const topScore = highestEvent.score.toFixed(1);
    
    const formattedDate = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    const subject = `Trading Digest — ${formattedDate} — Top: ${highestEvent.ticker} (${topScore})`;

    const email = process.env.DIGEST_TO_EMAIL;
    if (!email) {
      console.error("DIGEST_TO_EMAIL is not set in environment variables");
      return { success: false, error: "Missing email address config" };
    }

    const { data, error } = await resend.emails.send({
      from: "Trading Digest <onboarding@resend.dev>",
      to: [email],
      subject,
      html,
    });

    if (error) {
      console.error("Failed to send digest email via Resend:", error);
      return { success: false, error };
    }

    console.log("Digest email sent successfully:", data);
    return { success: true, data };
  } catch (error) {
    console.error("Error sending digest email:", error);
    return { success: false, error };
  } finally {
    await prisma.$disconnect();
  }
}
