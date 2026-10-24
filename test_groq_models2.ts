import { ChatGroq } from '@langchain/groq';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

async function test() {
  try {
    const llm = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      model: "llama-3.1-8b-instant",
      temperature: 0.2,
    });
    const res = await llm.invoke("Hello");
    console.log("llama-3.1-8b-instant:", res.content);
  } catch(e: any) {
    console.log("llama-3.1-8b-instant FAILED");
  }

  try {
    const llm2 = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      model: "llama3-8b-8192",
      temperature: 0.2,
    });
    const res2 = await llm2.invoke("Hello");
    console.log("llama3-8b-8192:", res2.content);
  } catch(e: any) {
    console.log("llama3-8b-8192 FAILED");
  }

  try {
    const llm3 = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      model: "mixtral-8x7b-32768",
      temperature: 0.2,
    });
    const res3 = await llm3.invoke("Hello");
    console.log("mixtral-8x7b-32768:", res3.content);
  } catch(e: any) {
    console.log("mixtral-8x7b-32768 FAILED");
  }
}
test();
