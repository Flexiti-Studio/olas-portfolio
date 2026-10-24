import { z } from "zod";

export const BeatSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  purpose: z.string(),
  mood: z.string(),
  share: z.number().min(0).max(1),
  media: z.enum(["video", "image", "either"]),
  tone: z.string().optional(),
});

export const VideoTemplateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  description: z.string(),
  format: z.enum(["16:9", "9:16", "1:1"]),
  targetSeconds: z.number().optional(),
  structure: z.array(BeatSchema).min(2, "At least 2 beats required"),
  voice: z.object({
    persona: z.string(),
    voiceId: z.string(),
    language: z.string().default("en"),
    accent: z.string().optional(),
    tone: z.string().default("neutral"),
    pace: z.enum(["slow", "normal", "fast"]).default("normal"),
    avoid: z.array(z.string()).default([]),
  }),
  image: z.object({
    style: z.string(),
    palette: z.string().optional(),
    lighting: z.string().optional(),
    framing: z.string().optional(),
    subject: z.string().optional(),
    references: z.array(z.string()).default([]),
    negative: z.string().default(""),
    model: z.string(),
  }),
  video: z.object({
    cameraMoves: z.array(z.string()),
    motion: z.enum(["subtle", "moderate", "dynamic"]),
    shotVariety: z.boolean().default(true),
    clipSeconds: z.object({ min: z.number(), max: z.number() }),
    chainFrames: z.boolean().default(false),
    model: z.string(),
  }),
  rules: z.object({
    wordsPerScene: z.number().min(5),
    minScenes: z.number().min(1),
    maxScenes: z.number().min(1),
    keepOriginalWording: z.boolean().default(true),
  }),
  version: z.number().default(1),
});

export type VideoTemplateData = z.infer<typeof VideoTemplateSchema>;
export type BeatData = z.infer<typeof BeatSchema>;
