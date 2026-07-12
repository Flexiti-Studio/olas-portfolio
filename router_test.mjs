import OpenAI from 'openai';
const openai = new OpenAI();
async function run() {
  const prompt = `Classify this message's domain as one of: TASK, KNOWLEDGE, AMBIGUOUS.
TASK = The user is adding a task, checking off a project, asking for a focus status, or managing their work/schedule.
KNOWLEDGE = The user is asking you a question, having a discussion, saving a new idea/fact, asking what they have saved, or deleting/removing a saved note. If the chat history shows you were just discussing ideas/knowledge, and their new message is a continuation of that discussion (like "does it make sense?", "yes", "tell me more"), this is KNOWLEDGE.
AMBIGUOUS = Only use this if it is completely impossible to tell. Use context to make a definitive choice whenever possible.

Recent Chat History (for context):
user: /ideas
assistant: 🧠 Your Knowledge Hub (Page 1 of 1 — 2 total entries)
1. [IDEA] save this dont be a new creator copy what others have doen a...
2. [IDEA] Idea: A new app that tracks water intake

Return only the single word.

User's New Message: "can you delete idea 2"`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'system', content: prompt }]
  });
  console.log('Result:', completion.choices[0].message.content);
}
run();
