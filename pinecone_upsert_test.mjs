import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

async function test() {
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const index = pc.index(process.env.PINECONE_INDEX || 'Focus-rag');
  
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  try {
    const text = "Save this: the server IP is 192.168.1.1";
    console.log("Generating embedding...");
    const emb = await openai.embeddings.create({
      input: text,
      model: "text-embedding-3-small",
      dimensions: 1024
    });
    
    const vector = emb.data[0].embedding;
    console.log("Vector generated. Length:", vector.length);
    
    console.log("Upserting into Pinecone...");
    await index.upsert({ records: [{
      id: "test-id-1234",
      values: vector,
      metadata: { type: "KNOWLEDGE", tags: ["server", "ip"] }
    }] });
    
    console.log("Upsert successful!");
    
    const stats = await index.describeIndexStats();
    console.log('Stats after upsert:', stats);
  } catch (error) {
    console.error("Error occurred:", error);
  }
}
test().catch(console.error);
