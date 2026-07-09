import { prisma } from "@/lib/prisma";
import openai from "@/lib/openai";
import { switchFocus, getFocusedProject } from "@/lib/focus/focus";

export async function handleFocusMessage(chatId: number, text: string, sendMessage: (chatId: number, text: string, options?: any) => Promise<void>, reqUrl: string) {
  if (text.startsWith("/projects")) {
    const projects = await prisma.project.findMany({
      where: { status: { not: "ARCHIVED" } },
      include: { _count: { select: { tasks: { where: { done: false } } } } }
    });
    const focusState = await prisma.focusState.findUnique({ where: { id: "singleton" } });
    
    let reply = "Active Projects:\n\n";
    for (const p of projects) {
      const isFocused = p.id === focusState?.focusedProjectId;
      reply += `${isFocused ? "▶️ " : "  "}${p.name} (${p._count.tasks} open tasks) [${p.status}]\n`;
    }
    await sendMessage(chatId, reply);
    return;
  }

  let intent = "UNCLEAR";
  if (text.startsWith("/status")) {
    intent = "STATUS";
  } else {
    const prompt = `Classify this message as one of: ADD_TASK, COMPLETE_TASK, SWITCH_FOCUS, STATUS, UNCLEAR.
ADD_TASK = wants to add a task to the current focused project.
COMPLETE_TASK = wants to check off / mark something done.
SWITCH_FOCUS = wants to change which project is active.
STATUS = asking what they're focused on or how it's going.
Return only the single word.

Message: "${text}"`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: prompt }],
      temperature: 0,
      max_tokens: 10
    });
    intent = completion.choices[0].message.content?.trim().toUpperCase() || "UNCLEAR";
  }

  if (intent === "STATUS") {
    const current = await getFocusedProject();
    if (!current) {
      await sendMessage(chatId, "No project is currently focused. Use /projects to see what's available.");
      return;
    }

    const totalTasks = current.tasks.length;
    const doneTasks = current.tasks.filter(t => t.done).length;
    const openTasks = current.tasks.filter(t => !t.done);

    let reply = `Focused on: ${current.name}\nProgress: ${doneTasks}/${totalTasks} tasks done\n\nRemaining:\n`;
    
    openTasks.forEach((t, i) => {
      reply += `${i + 1}. ${t.title}\n`;
    });

    await prisma.setting.upsert({
      where: { key: `focus:pending_status_${chatId}` },
      update: { value: openTasks.map(t => t.id) },
      create: { key: `focus:pending_status_${chatId}`, value: openTasks.map(t => t.id) }
    });

    await sendMessage(chatId, reply);
    return;
  }

  if (intent === "ADD_TASK") {
    const current = await getFocusedProject();
    if (!current) {
      await sendMessage(chatId, "Nothing's focused right now — which project?");
      return;
    }

    const prompt = `Extract the task title from this message. Return ONLY the title. Message: "${text}"`;
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: prompt }]
    });
    const title = completion.choices[0].message.content?.trim();

    if (!title) {
      await sendMessage(chatId, "Couldn't understand the task title.");
      return;
    }

    const order = current.tasks.length;
    const task = await prisma.task.create({
      data: { projectId: current.id, title, order }
    });

    await sendMessage(chatId, `Added to ${current.name}: ${task.title}`);
    return;
  }

  if (intent === "COMPLETE_TASK") {
    const current = await getFocusedProject();
    if (!current) {
      await sendMessage(chatId, "Nothing's focused right now.");
      return;
    }

    const numberMatch = text.match(/\b(\d+)\b/);
    let targetTaskId: string | null = null;

    if (numberMatch) {
      const idx = parseInt(numberMatch[1]) - 1;
      const statusSetting = await prisma.setting.findUnique({ where: { key: `focus:pending_status_${chatId}` } });
      if (statusSetting && Array.isArray(statusSetting.value)) {
        const ids = statusSetting.value as string[];
        if (ids[idx]) {
          targetTaskId = ids[idx];
        }
      }
    }

    if (!targetTaskId) {
      const openTasks = current.tasks.filter(t => !t.done);
      if (openTasks.length === 0) {
        await sendMessage(chatId, "No open tasks in this project.");
        return;
      }
      
      const inlineKeyboard = openTasks.map(t => [{ text: t.title, callback_data: `focus_done_${t.id}` }]);
      await sendMessage(chatId, "Which task did you complete?", { inline_keyboard: inlineKeyboard });
      return;
    }

    const host = new URL(reqUrl).host || "localhost:3000";
    const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
    
    const res = await fetch(`${protocol}://${host}/api/focus/tasks/${targetTaskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: true })
    });
    const json = await res.json();
    
    if (json.success) {
      if (json.data.projectCompleted) {
        await sendMessage(chatId, `🎉 Marked done! The project "${current.name}" is now complete. Use /projects to pick your next focus.`);
      } else {
        await sendMessage(chatId, `✅ Marked done: ${json.data.task.title}`);
      }
    } else {
      await sendMessage(chatId, "Failed to complete task.");
    }
    return;
  }

  if (intent === "SWITCH_FOCUS") {
    const prompt = `Extract the target project name from this message. Return ONLY the name. Message: "${text}"`;
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: prompt }]
    });
    const targetName = completion.choices[0].message.content?.trim().toLowerCase();

    if (!targetName) {
      await sendMessage(chatId, "Couldn't understand which project you want to focus on.");
      return;
    }

    const projects = await prisma.project.findMany({ where: { status: { not: "ARCHIVED" } } });
    const targetProject = projects.find(p => p.name.toLowerCase().includes(targetName));

    if (!targetProject) {
      await sendMessage(chatId, `Couldn't find an active project matching "${targetName}".`);
      return;
    }

    const switchResult = await switchFocus(targetProject.id);

    if (switchResult.requiresConfirmation) {
      await prisma.setting.upsert({
        where: { key: `focus:pending_switch_${chatId}` },
        update: { value: { targetId: targetProject.id } },
        create: { key: `focus:pending_switch_${chatId}`, value: { targetId: targetProject.id } }
      });

      const inlineKeyboard = [
        [{ text: "Yes, switch", callback_data: `focus_switch_force` }],
        [{ text: "No, stay", callback_data: `focus_switch_cancel` }]
      ];
      await sendMessage(chatId, `Your current project (${switchResult.currentProject?.name}) still has ${switchResult.incompleteCount} incomplete tasks. Are you sure you want to switch focus?`, { inline_keyboard: inlineKeyboard });
      return;
    }

    await sendMessage(chatId, `Focus switched to: ${targetProject.name}`);
    return;
  }

  await sendMessage(chatId, "I couldn't understand that. Please try again or use /status, /projects.");
}
