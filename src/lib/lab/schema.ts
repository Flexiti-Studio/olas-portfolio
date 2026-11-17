import { z } from "zod";

export const DemoTypeEnum = z.enum([
  "SANDBOX",
  "COMPONENT",
  "API_TESTER",
  "EXPLAINER",
  "SELF_CHECK",
]);

export const LabStatusEnum = z.enum(["LEARNING", "PRACTICING", "CONFIRMED"]);

export const SandboxConfigSchema = z.object({
  demoType: z.literal("SANDBOX"),
  language: z.enum(["js", "ts", "react", "python"]),
  starterCode: z.string(),
});

export const ComponentConfigSchema = z.object({
  demoType: z.literal("COMPONENT"),
  componentKey: z.string().min(1, "Component key is required"),
});

export const ApiTesterConfigSchema = z.object({
  demoType: z.literal("API_TESTER"),
  method: z.enum(["GET", "POST", "PUT", "DELETE"]),
  url: z.string().min(1, "URL is required"),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.string().optional(),
});

export const ExplainerStepSchema = z.object({
  title: z.string().min(1, "Step title is required"),
  description: z.string().min(1, "Step description is required"),
  state: z.record(z.string(), z.unknown()).optional(),
});

export const ExplainerConfigSchema = z.object({
  demoType: z.literal("EXPLAINER"),
  steps: z.array(ExplainerStepSchema).min(1, "At least one step is required"),
});

export const SelfCheckQuestionSchema = z.object({
  q: z.string().min(1, "Question is required"),
  answer: z.string().min(1, "Answer is required"),
  explanation: z.string().min(1, "Explanation is required"),
});

export const SelfCheckConfigSchema = z.object({
  demoType: z.literal("SELF_CHECK"),
  questions: z.array(SelfCheckQuestionSchema).min(1, "At least one question is required"),
});

export const LabConfigDiscriminatedSchema = z.discriminatedUnion("demoType", [
  SandboxConfigSchema,
  ComponentConfigSchema,
  ApiTesterConfigSchema,
  ExplainerConfigSchema,
  SelfCheckConfigSchema,
]);

// Base unrefined object schema so .partial() works cleanly
const BaseLabEntryObject = z.object({
  title: z.string().min(1, "Title is required").max(120),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens"),
  category: z.string().min(1, "Category is required"),
  demoType: DemoTypeEnum,
  notes: z.string().optional().nullable(),
  whyItMatters: z.string().optional().nullable(),
  config: z.record(z.string(), z.unknown()),
  status: LabStatusEnum.default("LEARNING"),
  isPublic: z.boolean().default(false),
  featured: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

export const CreateLabEntrySchema = BaseLabEntryObject.superRefine((data, ctx) => {
  const configWithDemoType = { ...data.config, demoType: data.demoType };
  const result = LabConfigDiscriminatedSchema.safeParse(configWithDemoType);
  if (!result.success) {
    result.error.issues.forEach((issue) => {
      ctx.addIssue({
        ...issue,
        path: ["config", ...issue.path.filter((p) => p !== "demoType")],
      });
    });
  }
});

export const UpdateLabEntrySchema = BaseLabEntryObject.partial().superRefine((data, ctx) => {
  if (data.demoType && data.config) {
    const configWithDemoType = { ...data.config, demoType: data.demoType };
    const result = LabConfigDiscriminatedSchema.safeParse(configWithDemoType);
    if (!result.success) {
      result.error.issues.forEach((issue) => {
        ctx.addIssue({
          ...issue,
          path: ["config", ...issue.path.filter((p) => p !== "demoType")],
        });
      });
    }
  }
});

export type DemoType = z.infer<typeof DemoTypeEnum>;
export type LabStatus = z.infer<typeof LabStatusEnum>;
export type SandboxConfig = z.infer<typeof SandboxConfigSchema>;
export type ComponentConfig = z.infer<typeof ComponentConfigSchema>;
export type ApiTesterConfig = z.infer<typeof ApiTesterConfigSchema>;
export type ExplainerConfig = z.infer<typeof ExplainerConfigSchema>;
export type SelfCheckConfig = z.infer<typeof SelfCheckConfigSchema>;
export type LabConfig = z.infer<typeof LabConfigDiscriminatedSchema>;
export type CreateLabEntryInput = z.infer<typeof CreateLabEntrySchema>;
export type UpdateLabEntryInput = z.infer<typeof UpdateLabEntrySchema>;
