import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SETTING_KEY = "widget_update";
const HISTORY_SETTING_KEY = "widget_release_history";

const DEFAULT_UPDATE_PAYLOAD = {
  version: "1.2.0",
  notes: "Version 1.2: Ability to create projects directly from widget and full offline auto-sync.",
  pubDate: new Date().toISOString(),
  signature: "",
  downloadUrl: "https://ola.flexitistudio.com/downloads/olas-todo-widget_1.2.0_x64-setup.exe",
  isActive: true,
};

async function getReleasesFromDb(): Promise<any[]> {
  try {
    if ((prisma as any).widgetRelease?.findMany) {
      return await (prisma as any).widgetRelease.findMany({
        orderBy: { createdAt: "desc" },
      });
    }

    const rows: any[] = await prisma.$queryRaw`
      SELECT id, version, notes, download_url as "downloadUrl", signature, is_active as "isActive", pub_date as "pubDate", created_at as "createdAt"
      FROM widget_releases
      ORDER BY created_at DESC
    `;
    return rows;
  } catch {
    // Fallback to Setting table history
    try {
      const setting = await prisma.setting.findUnique({
        where: { key: HISTORY_SETTING_KEY },
      });
      return setting?.value ? (setting.value as any[]) : [];
    } catch {
      return [];
    }
  }
}

async function getActiveReleaseFromDb(): Promise<any | null> {
  try {
    if ((prisma as any).widgetRelease?.findFirst) {
      const active = await (prisma as any).widgetRelease.findFirst({
        where: { isActive: true },
        orderBy: { updatedAt: "desc" },
      });
      if (active) return active;
    }

    const rows: any[] = await prisma.$queryRaw`
      SELECT id, version, notes, download_url as "downloadUrl", signature, is_active as "isActive", pub_date as "pubDate", created_at as "createdAt"
      FROM widget_releases
      WHERE is_active = true
      ORDER BY updated_at DESC
      LIMIT 1
    `;
    if (rows && rows.length > 0) return rows[0];
  } catch {}

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const history = url.searchParams.get("history") === "true";

    if (history) {
      const releases = await getReleasesFromDb();
      if (releases && releases.length > 0) {
        return NextResponse.json({ success: true, releases });
      }

      const setting = await prisma.setting.findUnique({ where: { key: SETTING_KEY } });
      const data = setting?.value ? (setting.value as any) : DEFAULT_UPDATE_PAYLOAD;
      return NextResponse.json({ success: true, releases: [data] });
    }

    const activeRelease = await getActiveReleaseFromDb();

    if (activeRelease) {
      const cleanVer = (activeRelease.version || "1.2.0").trim().replace(/^v/i, "");
      const sig = (activeRelease.signature || "").trim();
      const downloadLink = (activeRelease.downloadUrl || "").trim();

      const platformPayload = { signature: sig, url: downloadLink };

      return NextResponse.json({
        version: cleanVer,
        notes: activeRelease.notes || "",
        pub_date: activeRelease.pubDate ? new Date(activeRelease.pubDate).toISOString() : new Date().toISOString(),
        platforms: {
          "windows-x86_64": platformPayload,
          "x86_64-pc-windows-msvc": platformPayload,
          "windows-x86_64-nsis": platformPayload,
          "windows-x86_64-msi": platformPayload,
          "win64": platformPayload,
        },
      });
    }

    // Fallback to Setting table
    const setting = await prisma.setting.findUnique({ where: { key: SETTING_KEY } });
    const data = setting?.value ? (setting.value as any) : DEFAULT_UPDATE_PAYLOAD;

    if (!data.isActive) {
      return NextResponse.json({ message: "No active updates available" }, { status: 204 });
    }

    const cleanVer = (data.version || "1.2.0").trim().replace(/^v/i, "");
    const sig = (data.signature || "").trim();
    const downloadLink = (data.downloadUrl || DEFAULT_UPDATE_PAYLOAD.downloadUrl).trim();

    const platformPayload = { signature: sig, url: downloadLink };

    return NextResponse.json({
      version: cleanVer,
      notes: data.notes || "Bug fixes and performance improvements.",
      pub_date: data.pubDate || new Date().toISOString(),
      platforms: {
        "windows-x86_64": platformPayload,
        "x86_64-pc-windows-msvc": platformPayload,
        "windows-x86_64-nsis": platformPayload,
        "windows-x86_64-msi": platformPayload,
        "win64": platformPayload,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { version, notes, downloadUrl, signature, isActive } = body;

    if (!version || !downloadUrl) {
      return NextResponse.json(
        { success: false, error: { message: "Version and downloadUrl are required" } },
        { status: 400 }
      );
    }

    const setAsActive = isActive !== undefined ? Boolean(isActive) : true;
    const cleanVersion = version.trim().replace(/^v/i, "");
    const cleanUrl = downloadUrl.trim();
    const cleanNotes = (notes || "").trim();
    const cleanSig = (signature || "").trim();
    const now = new Date();

    try {
      if (setAsActive) {
        if ((prisma as any).widgetRelease?.updateMany) {
          await (prisma as any).widgetRelease.updateMany({ data: { isActive: false } });
        } else {
          await prisma.$executeRaw`UPDATE widget_releases SET is_active = false`;
        }
      }

      if ((prisma as any).widgetRelease?.upsert) {
        await (prisma as any).widgetRelease.upsert({
          where: { version: cleanVersion },
          update: { notes: cleanNotes, downloadUrl: cleanUrl, signature: cleanSig, isActive: setAsActive, pubDate: now },
          create: { version: cleanVersion, notes: cleanNotes, downloadUrl: cleanUrl, signature: cleanSig, isActive: setAsActive, pubDate: now },
        });
      } else {
        await prisma.$executeRaw`
          INSERT INTO widget_releases (id, version, notes, download_url, signature, is_active, pub_date, created_at, updated_at)
          VALUES (gen_random_uuid()::text, ${cleanVersion}, ${cleanNotes}, ${cleanUrl}, ${cleanSig}, ${setAsActive}, ${now}, ${now}, ${now})
          ON CONFLICT (version) DO UPDATE SET
            notes = ${cleanNotes}, download_url = ${cleanUrl}, signature = ${cleanSig}, is_active = ${setAsActive}, pub_date = ${now}, updated_at = ${now}
        `;
      }
    } catch (dbErr) {
      console.warn("DB Upsert raw fallback:", dbErr);
    }

    // Sync to Setting table
    const settingPayload = {
      version: cleanVersion,
      notes: cleanNotes,
      downloadUrl: cleanUrl,
      signature: cleanSig,
      isActive: setAsActive,
      pubDate: now.toISOString(),
    };

    await prisma.setting.upsert({
      where: { key: SETTING_KEY },
      update: { value: settingPayload },
      create: { key: SETTING_KEY, value: settingPayload },
    });

    // Update history setting list
    try {
      const existingHistorySetting = await prisma.setting.findUnique({ where: { key: HISTORY_SETTING_KEY } });
      const currentList: any[] = existingHistorySetting?.value ? (existingHistorySetting.value as any[]) : [];
      const updatedList = [settingPayload, ...currentList.filter(item => item.version !== cleanVersion)];
      await prisma.setting.upsert({
        where: { key: HISTORY_SETTING_KEY },
        update: { value: updatedList },
        create: { key: HISTORY_SETTING_KEY, value: updatedList },
      });
    } catch {}

    return NextResponse.json({ success: true, data: settingPayload });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { version, id } = body;

    if (!version && !id) {
      return NextResponse.json(
        { success: false, error: { message: "Version string or ID is required for rollback" } },
        { status: 400 }
      );
    }

    const cleanVersion = version?.trim();

    try {
      if ((prisma as any).widgetRelease?.updateMany) {
        await (prisma as any).widgetRelease.updateMany({ data: { isActive: false } });
        if (id) {
          await (prisma as any).widgetRelease.update({ where: { id }, data: { isActive: true } });
        } else {
          await (prisma as any).widgetRelease.update({ where: { version: cleanVersion }, data: { isActive: true } });
        }
      } else {
        await prisma.$executeRaw`UPDATE widget_releases SET is_active = false`;
        if (id) {
          await prisma.$executeRaw`UPDATE widget_releases SET is_active = true WHERE id = ${id}`;
        } else {
          await prisma.$executeRaw`UPDATE widget_releases SET is_active = true WHERE version = ${cleanVersion}`;
        }
      }
    } catch (dbErr) {
      console.warn("DB PATCH raw fallback:", dbErr);
    }

    // Sync active release to Setting table
    const activeRelease = await getActiveReleaseFromDb();
    const settingPayload = activeRelease ? {
      version: activeRelease.version,
      notes: activeRelease.notes || "",
      downloadUrl: activeRelease.downloadUrl,
      signature: activeRelease.signature || "",
      isActive: true,
      pubDate: activeRelease.pubDate ? new Date(activeRelease.pubDate).toISOString() : new Date().toISOString(),
    } : {
      version: cleanVersion,
      downloadUrl: "",
      notes: "",
      isActive: true,
      pubDate: new Date().toISOString(),
    };

    await prisma.setting.upsert({
      where: { key: SETTING_KEY },
      update: { value: settingPayload },
      create: { key: SETTING_KEY, value: settingPayload },
    });

    return NextResponse.json({ success: true, data: settingPayload });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}
