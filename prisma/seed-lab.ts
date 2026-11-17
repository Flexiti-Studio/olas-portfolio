import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding initial Lab entries...");

  const componentEntry = await prisma.labEntry.upsert({
    where: { slug: "interactive-button-matrix" },
    update: {},
    create: {
      slug: "interactive-button-matrix",
      title: "Interactive Button Matrix & Spring Feedback",
      category: "UI Components",
      demoType: "COMPONENT",
      whyItMatters:
        "High-performance design systems require deterministic micro-interactions that feel responsive without causing excessive DOM layout shifts.",
      notes: `### Interactive Micro-Interactions & Tactile Feedback
- **Active state scaling**: Subtly scaling down on \`active:scale-95\` delivers instant physical feedback before network round-trips.
- **Optimistic Loaders**: Showing localized spinner animations inside the trigger button prevents user double-submissions and UI disorientation.
- **Separation of concerns**: Dynamic component registry maps client modules asynchronously without bloating the main bundle.`,
      config: {
        componentKey: "InteractiveButtonDemo",
      },
      status: "CONFIRMED",
      isPublic: true,
      featured: true,
      sortOrder: 0,
    },
  });

  const debouncedEntry = await prisma.labEntry.upsert({
    where: { slug: "debounced-search-pipeline" },
    update: {},
    create: {
      slug: "debounced-search-pipeline",
      title: "Debounced Auto-Suggest Search Pipeline",
      category: "Performance",
      demoType: "COMPONENT",
      whyItMatters:
        "Prevents backend denial of service and race conditions during rapid keystroke dispatching in production search inputs.",
      notes: `### Debounce vs Throttle Tradeoffs
- **Debounce**: Delays execution until a period of inactivity has elapsed. Essential for auto-completing search boxes.
- **Cleanup**: Returning \`() => clearTimeout(handler)\` from \`useEffect\` cancels inflight timers whenever new keystrokes arrive, preventing state tearing.`,
      config: {
        componentKey: "DebouncedSearchDemo",
      },
      status: "PRACTICING",
      isPublic: true,
      featured: true,
      sortOrder: 1,
    },
  });

  console.log("Seeded entries:", componentEntry.slug, debouncedEntry.slug);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

