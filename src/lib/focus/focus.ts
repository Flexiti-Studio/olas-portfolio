import { prisma } from "@/lib/prisma";

export async function getFocusedProject() {
  const focusState = await prisma.focusState.findUnique({ where: { id: "singleton" } });
  if (!focusState || !focusState.focusedProjectId) return null;
  return prisma.project.findUnique({
    where: { id: focusState.focusedProjectId },
    include: { tasks: { orderBy: { order: 'asc' } } }
  });
}

export async function countIncompleteTasks(projectId: string) {
  return prisma.task.count({
    where: { projectId, done: false }
  });
}

export async function markProjectDoneAndClearFocus(projectId: string) {
  await prisma.project.update({
    where: { id: projectId },
    data: { status: "DONE", completedAt: new Date() }
  });
  
  await prisma.focusState.update({
    where: { id: "singleton" },
    data: { focusedProjectId: null }
  });
}

export async function switchFocus(projectId: string, { force }: { force?: boolean } = {}) {
  const current = await getFocusedProject();
  if (current && current.id !== projectId) {
    const incomplete = await countIncompleteTasks(current.id);
    if (incomplete > 0 && !force) {
      return { requiresConfirmation: true, incompleteCount: incomplete, currentProject: current };
    }
  }

  await prisma.focusState.upsert({
    where: { id: "singleton" },
    update: { focusedProjectId: projectId },
    create: { id: "singleton", focusedProjectId: projectId }
  });

  return { requiresConfirmation: false };
}

export async function completeTask(taskId: string) {
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { done: true, completedAt: new Date() }
  });

  const remaining = await countIncompleteTasks(task.projectId);
  if (remaining === 0) {
    await markProjectDoneAndClearFocus(task.projectId);
  }

  return { task, projectCompleted: remaining === 0 };
}
