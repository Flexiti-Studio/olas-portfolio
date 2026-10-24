import { VideoTemplateData, BeatData } from "../validations/videoTemplate";

export interface GenerationPlanScene {
  beatName: string;
  media: "image" | "video";
  clipSeconds: number;
  voice: {
    persona: string;
    tone: string;
  };
  visualInstruction: string;
  storySegment: string; // The part of the story assigned to this scene (for preview purposes)
  wordsCount: number;
}

export interface GenerationPlan {
  sceneCount: number;
  scenes: GenerationPlanScene[];
  aiLog: string[];
}

export function compileTemplate(template: VideoTemplateData, story: string): GenerationPlan {
  const aiLog: string[] = [];
  
  // Basic word count
  const words = story.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  aiLog.push(`Input story has ${wordCount} words.`);

  // 1. Scene count
  let rawSceneCount = Math.ceil(wordCount / template.rules.wordsPerScene);
  aiLog.push(`Based on target of ${template.rules.wordsPerScene} words/scene, raw estimate is ${rawSceneCount} scenes.`);
  
  if (rawSceneCount < template.rules.minScenes) {
    aiLog.push(`Estimate is below minScenes (${template.rules.minScenes}). Adjusting up.`);
    rawSceneCount = template.rules.minScenes;
  }
  if (rawSceneCount > template.rules.maxScenes) {
    aiLog.push(`Estimate is above maxScenes (${template.rules.maxScenes}). Adjusting down.`);
    rawSceneCount = template.rules.maxScenes;
  }
  
  // If no words, just use minScenes
  const sceneCount = wordCount === 0 ? template.rules.minScenes : rawSceneCount;
  aiLog.push(`Final scene count decided: ${sceneCount} scenes.`);

  // Pace multiplier
  let paceMultiplier = 1;
  if (template.voice.pace === "slow") paceMultiplier = 0.8;
  if (template.voice.pace === "fast") paceMultiplier = 1.2;
  const WORDS_PER_SECOND = 2.6 * paceMultiplier;
  aiLog.push(`Voice pace is '${template.voice.pace}', computing ~${WORDS_PER_SECOND.toFixed(1)} words spoken per second.`);

  // Calculate total scenes per beat based on share
  const beats = template.structure;
  const scenes: GenerationPlanScene[] = [];
  
  const totalShare = beats.reduce((sum, b) => sum + (b.share || 0), 0);
  const normalizedBeats = beats.map(b => ({
    ...b,
    share: totalShare > 0 ? (b.share || 0) / totalShare : 1 / beats.length
  }));

  const wordsPerScene = wordCount / sceneCount;

  let currentBeatIndex = 0;
  let cumulativeShare = normalizedBeats[0].share;
  let lastShot = "";

  for (let i = 0; i < sceneCount; i++) {
    const sceneProgress = (i + 0.5) / sceneCount;
    while (sceneProgress > cumulativeShare && currentBeatIndex < normalizedBeats.length - 1) {
      currentBeatIndex++;
      cumulativeShare += normalizedBeats[currentBeatIndex].share;
    }

    const beat = normalizedBeats[currentBeatIndex];
    if (i === 0) aiLog.push(`Mapping Scene 1 to Beat: '${beat.name}' based on structure shares.`);

    // Estimated spoken length
    const sceneWords = Math.round(wordsPerScene);
    const spokenLength = sceneWords / WORDS_PER_SECOND;

    // 3. Media per scene
    let media = beat.media;
    if (media === "either") {
      media = spokenLength >= 4 ? "video" : "image";
      if (i === 0) aiLog.push(`Scene 1 media is 'either'. Since length (~${spokenLength.toFixed(1)}s) is ${spokenLength >= 4 ? '>= 4s' : '< 4s'}, resolved to '${media}'.`);
    }

    // 4. Clip length
    let clipSeconds = Math.ceil(spokenLength);
    if (media === "video" && template.video.clipSeconds) {
      if (clipSeconds < template.video.clipSeconds.min) clipSeconds = template.video.clipSeconds.min;
      if (clipSeconds > template.video.clipSeconds.max) clipSeconds = template.video.clipSeconds.max;
    }

    // 5. Voice per scene
    const voiceTone = beat.tone || template.voice.tone;

    // 6. Visual prompt
    let shot = "";
    if (media === "video") {
      const moves = template.video.cameraMoves;
      if (moves.length > 0) {
        shot = moves[i % moves.length];
        if (template.video.shotVariety && shot === lastShot && moves.length > 1) {
          shot = moves[(i + 1) % moves.length];
        }
        lastShot = shot;
      }
    }

    // Extract actual words for this scene to make the prompt detailed
    const startIndex = Math.min(words.length, Math.round(i * wordsPerScene));
    const endIndex = Math.min(words.length, Math.round((i + 1) * wordsPerScene));
    const sceneStorySegment = words.slice(startIndex, endIndex).join(" ");

    // Build the visual instruction block for the preview
    let visualInstruction = `[Format: ${template.format}] `;
    
    if (media === "image") {
      visualInstruction += `Style: ${template.image.style}. ${template.image.palette ? `Palette: ${template.image.palette}. ` : ''}`;
      visualInstruction += `\nSubject/Action: Visualize the following scene conceptually: "${sceneStorySegment}". `;
      visualInstruction += `\nContext: ${beat.name} (Mood: ${beat.mood}).`;
    } else {
      visualInstruction += `Motion: ${template.video.motion}. Camera: ${shot || 'auto'}. `;
      visualInstruction += `\nSubject/Action: Cinematic video sequence depicting: "${sceneStorySegment}". `;
      visualInstruction += `\nContext: ${beat.name} (Mood: ${beat.mood}).`;
    }

    scenes.push({
      beatName: beat.name,
      media: media as "image" | "video",
      clipSeconds,
      voice: {
        persona: template.voice.persona,
        tone: voiceTone
      },
      visualInstruction,
      storySegment: sceneStorySegment,
      wordsCount: sceneStorySegment.split(/\s+/).length
    });
  }

  return {
    sceneCount,
    scenes,
    aiLog
  };
}
