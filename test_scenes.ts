import { generateScenesAction } from './src/app/admin/creators/[id]/scenework/actions/generateScenes';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

async function test() {
  try {
    const res = await generateScenesAction({
      story: "Most small businesses in Lagos do not lose customers because of price. They lose them in the inbox.",
      templateId: "explainer"
    });
    console.log("Success:", res);
  } catch(e: any) {
    console.error("Caught error:", e.message);
  }
}

test();
