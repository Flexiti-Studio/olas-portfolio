import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

async function getModels() {
  const res = await fetch("https://api.groq.com/openai/v1/models", {
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`
    }
  });
  const data = await res.json();
  console.log(data.data.map((m: any) => m.id));
}

getModels();
