"use server";

import { z } from "zod";
import { ChatGroq } from "@langchain/groq";
import { compileTemplate } from "@/lib/scenework/compiler";
import { VideoTemplateData } from "@/lib/validations/videoTemplate";
import type { Scene } from "../store/useSceneworkStore";

const SceneOutputSchema = z.object({
  beat: z.string().describe("The name of the beat this scene corresponds to."),
  script: z
    .string()
    .describe(
      "The voiceover script, lightly trimmed for speaking from the original story text, or kept exactly depending on rules.",
    ),
  media: z
    .enum(["image", "video"])
    .describe("Whether this scene is an image or video."),
  shot: z
    .string()
    .describe("Shot type from the allowed list, e.g., wide, medium, close-up."),
  camera: z.string().describe("Camera move from the allowed list."),
  visualPrompt: z
    .string()
    .describe(
      "A visual description of what the camera sees: subject, setting, action. Must make sense while script is spoken.",
    ),
  negativePrompt: z
    .string()
    .describe("Things to avoid in the visual generation."),
  tone: z.string().describe("The emotional tone of the voiceover."),
  clipSeconds: z.number().describe("The length of the scene in seconds."),
});

const ScenesSchema = z.object({
  scenes: z.array(SceneOutputSchema),
});

export async function generateScenesAction({
  story,
  templateId,
}: {
  story: string;
  templateId: string;
}) {
  const { prisma } = await import("@/lib/prisma");

  const template = await prisma.videoTemplate.findUnique({
    where: { id: templateId },
  });

  if (!template) {
    throw new Error("Template not found in DB.");
  }

  const templateData = template.data as VideoTemplateData;

  // 1. Pre-compile the plan
  const plan = compileTemplate(templateData, story);

  // 2. Setup Groq LLM
  const llm = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY, // Make sure this is defined
    model: "llama-3.1-8b-instant",
    temperature: 0.2,
  });

  const structuredLlm = llm.withStructuredOutput(ScenesSchema, {
    name: "generate_scenes",
  });

  const prompt = `
You are an expert AI video director. Your goal is to break a finished story into video scenes based on a pre-compiled generation plan.

### Input Story
"""
${story}
"""

### Pre-compiled Generation Plan
Number of scenes to generate: ${plan.sceneCount}
Original words per scene: ${templateData.rules.wordsPerScene}

Plan per scene:
${plan.scenes
  .map(
    (s, i) => `Scene ${i + 1}:
- Beat: ${s.beatName}
- Media: ${s.media}
- Voice Tone: ${s.voice.tone}
- Target Clip Seconds: ${s.clipSeconds}s
- Visual Instructions: ${s.visualInstruction}
`,
  )
  .join("\n")}

### Rules
1. Split the story in order into EXACTLY ${plan.sceneCount} scenes. Do NOT add events that are not in the story.
2. For each scene, map its properties precisely based on the provided generation plan above (beat, media, tone, clipSeconds).
3. 'script' is the voiceover. If keepOriginalWording is true (${templateData.rules.keepOriginalWording}), use exact wording. Otherwise lightly trim it for speaking.
4. 'visualPrompt' describes ONLY what the camera sees based on Visual Instructions. No text/abstract concepts.
5. 'negativePrompt' should incorporate: ${templateData.image.negative}.
6. 'shot' and 'camera' should be varied if media is video, unless restricted by instructions.
7. The visual must make sense while the script is being spoken.
`;

  try {
    const response = await structuredLlm.invoke(prompt);

    const pace: Scene["pace"] =
      templateData.voice.pace?.toLowerCase() === "slow"
        ? "Slow"
        : templateData.voice.pace?.toLowerCase() === "fast"
          ? "Fast"
          : "Normal";

    // Map response to the Scenework Store Scene type
    return response.scenes.map((scene, index): Scene => {
      return {
        id: `scene-${Date.now()}-${index}`,
        order: index,
        role: scene.beat,
        beat: scene.script,
        script: scene.script,
        mode: scene.media,
        shot: scene.shot,
        camera: scene.camera,
        visualPrompt: scene.visualPrompt,
        negativePrompt:
          scene.negativePrompt || templateData.image.negative || "",
        persona: templateData.voice.persona,
        tone: scene.tone,
        pace,
        clipSec: scene.clipSeconds,
        locked: false,
        status: "ready",
        version: template.version,
        templateId: template.id,
        templateVersion: template.version,
      };
    });
  } catch (error: any) {
    console.error("Error generating scenes:", error?.message || error);
    throw new Error(
      `Failed to generate scenes using Groq: ${error?.message || error}`,
    );
  }
}
