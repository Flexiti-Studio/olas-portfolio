export type TemplateBeat = {
  name: string;
  description: string;
  mood: string;
};

export type Template = {
  id: string;
  name: string;
  description: string;
  beats: TemplateBeat[];
  styleString: string;
  defaultPersona: string;
  wordsPerScene: number;
};

export const TEMPLATES: Template[] = [
  {
    id: "explainer",
    name: "Explainer",
    description: "Clear, informative, and engaging. Great for tutorials or product breakdowns.",
    beats: [
      { name: "Hook", description: "Grab attention immediately with a strong statement or question.", mood: "Energetic and curious" },
      { name: "Problem", description: "Establish the core problem or pain point.", mood: "Empathetic and serious" },
      { name: "Solution", description: "Introduce the solution clearly.", mood: "Bright and optimistic" },
      { name: "Details", description: "Break down how it works.", mood: "Informative and structured" },
      { name: "Call to Action", description: "Tell the viewer what to do next.", mood: "Direct and encouraging" }
    ],
    styleString: "clean vector art style, bright colors, minimalist background, well-lit, professional",
    defaultPersona: "Friendly Expert",
    wordsPerScene: 30,
  },
  {
    id: "short-hook",
    name: "Short-form Hook",
    description: "High energy, fast-paced vertical format optimized for retention.",
    beats: [
      { name: "The Hook", description: "The first 3 seconds to stop the scroll.", mood: "High energy, surprising" },
      { name: "The Payoff", description: "Deliver on the promise quickly.", mood: "Satisfying, fast-paced" },
      { name: "The Twist", description: "A surprising detail or counter-intuitive fact.", mood: "Intriguing" },
      { name: "Outro", description: "Quick sign-off or loop point.", mood: "Punchy" }
    ],
    styleString: "vibrant neon lighting, dynamic camera angle, hyper-realistic, dramatic shadows, 8k resolution",
    defaultPersona: "Energetic Creator",
    wordsPerScene: 15,
  },
  {
    id: "cinematic",
    name: "Cinematic Story",
    description: "Focus on emotion, atmosphere, and visual storytelling.",
    beats: [
      { name: "Establish", description: "Set the scene and atmosphere.", mood: "Calm, atmospheric" },
      { name: "Inciting Incident", description: "The moment things change.", mood: "Tense or emotional" },
      { name: "Rising Action", description: "Building the story or tension.", mood: "Dynamic, moving forward" },
      { name: "Climax", description: "The peak emotional moment.", mood: "Dramatic, visually striking" },
      { name: "Resolution", description: "The aftermath and closing thought.", mood: "Reflective, peaceful" }
    ],
    styleString: "cinematic lighting, anamorphic lens flare, moody atmosphere, film grain, shot on 35mm, shallow depth of field",
    defaultPersona: "Deep Voice Narrator",
    wordsPerScene: 40,
  }
];

export const FORMATS = [
  { id: "16:9", label: "Landscape (16:9)" },
  { id: "9:16", label: "Vertical (9:16)" },
  { id: "1:1", label: "Square (1:1)" }
];
