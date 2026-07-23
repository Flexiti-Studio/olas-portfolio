import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // 1. Applications stats
    const totalApps = await prisma.application.count();
    const appStages = await prisma.application.groupBy({
      by: ["stage"],
      _count: {
        id: true,
      },
    });

    const stageMap: Record<string, number> = {
      Wishlist: 0,
      Applied: 0,
      Interviewing: 0,
      Offer: 0,
      Rejected: 0,
    };

    appStages.forEach((item) => {
      const stageName = item.stage || "Wishlist";
      if (stageName in stageMap) {
        stageMap[stageName] = item._count.id;
      }
    });

    // 2. Prep Courses stats
    const totalCourses = await prisma.course.count();
    const courses = await prisma.course.findMany({
      include: {
        progress: true,
      },
    });

    let avgProgress = 0;
    let avgQuiz = 0;
    let quizCount = 0;
    if (courses.length > 0) {
      let progressSum = 0;
      let quizSum = 0;
      courses.forEach((c) => {
        progressSum += c.progress?.overall_percentage || 0;
        if (c.progress?.quiz_average && c.progress.quiz_average > 0) {
          quizSum += c.progress.quiz_average;
          quizCount++;
        }
      });
      avgProgress = Math.round(progressSum / courses.length);
      avgQuiz = quizCount > 0 ? Math.round(quizSum / quizCount) : 0;
    }

    // 3. Cover Letters & CV tailor
    const totalCoverLetters = await prisma.coverLetter.count();
    const totalCVs = await prisma.cvRecord.count();

    // 4. Auto apply speed applier stats
    const totalSpeedApps = await prisma.taskApplication.count();
    
    // 5. Budget total ledger balance
    const bankAccounts = await prisma.bankAccount.findMany();
    const totalBalance = bankAccounts.reduce((acc, account) => acc + Number(account.balance), 0);

    // 6. Recent activity aggregation
    const [recentApps, recentCourses, recentCVs] = await Promise.all([
      prisma.application.findMany({
        take: 3,
        orderBy: { created_at: "desc" },
      }),
      prisma.course.findMany({
        take: 3,
        orderBy: { created_at: "desc" },
      }),
      prisma.cvRecord.findMany({
        take: 3,
        orderBy: { created_at: "desc" },
      }),
    ]);

    const activityTimeline: any[] = [];
    recentApps.forEach((item) => {
      activityTimeline.push({
        id: `app_${item.id}`,
        title: `Applied to ${item.company}`,
        subtitle: item.job_title,
        date: item.created_at || new Date(),
        type: "application",
      });
    });
    recentCourses.forEach((item) => {
      activityTimeline.push({
        id: `course_${item.id}`,
        title: `Created Prep Course: ${item.title}`,
        subtitle: `${item.source_type.toUpperCase()} Source Material`,
        date: item.created_at || new Date(),
        type: "course",
      });
    });
    recentCVs.forEach((item) => {
      activityTimeline.push({
        id: `cv_${item.id}`,
        title: `Tailored CV for ${item.company}`,
        subtitle: item.job_title,
        date: item.created_at || new Date(),
        type: "cv",
      });
    });

    activityTimeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 7. Auto apply weekly trend
    const sessionCounters = await prisma.taskSessionCounter.findMany({
      orderBy: {
        date: "asc"
      },
      take: 12
    });

    const speedHistory = sessionCounters.map(s => ({
      date: s.date.substring(5), // truncate YYYY-
      applied: s.linkCount,
      sessions: s.sessionCount,
    }));

    // 8. General applications trend
    const allApps = await prisma.application.findMany({
      select: {
        created_at: true,
      },
      orderBy: {
        created_at: "asc",
      },
    });

    const appsGroupedByDate: Record<string, number> = {};
    allApps.forEach(app => {
      if (app.created_at) {
        const dateStr = new Date(app.created_at).toISOString().split('T')[0].substring(5); // MM-DD
        appsGroupedByDate[dateStr] = (appsGroupedByDate[dateStr] || 0) + 1;
      }
    });

    const appHistory = Object.entries(appsGroupedByDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-12);

    // 9. Fetch most recent project and its task list
    const recentProject = await prisma.project.findFirst({
      orderBy: { createdAt: "desc" },
      include: {
        tasks: {
          orderBy: { order: "asc" },
        },
      },
    });

    // 10. Fetch stored knowledge entries for the dashboard slider
    const knowledge = await prisma.knowledgeEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json({
      applications: {
        total: totalApps,
        stages: stageMap,
        history: appHistory,
      },
      courses: {
        total: totalCourses,
        avgProgress,
        avgQuiz,
      },
      cvs: {
        total: totalCVs,
      },
      coverLetters: {
        total: totalCoverLetters,
      },
      speedApps: {
        total: totalSpeedApps,
        history: speedHistory,
      },
      budget: {
        totalBalance,
      },
      timeline: activityTimeline.slice(0, 5),
      recentProject,
      knowledge,
    });
  } catch (error: any) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
