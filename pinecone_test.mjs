import { Pinecone } from '@pinecone-database/pinecone';
import { PrismaClient } from '@prisma/client';

async function test() {
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const index = pc.index(process.env.PINECONE_INDEX || 'Focus-rag');
  
  const stats = await index.describeIndexStats();
  console.log('Stats:', stats);
  
  const prisma = new PrismaClient();
  const entries = await prisma.knowledgeEntry.findMany();
  console.log('DB Entries:', entries.length);
  
  const queryRes = await index.query({
    vector: new Array(1536).fill(0.1), // mock vector
    topK: 5,
    includeMetadata: true
  });
  console.log('Query Res:', queryRes);
}
test().catch(console.error);
