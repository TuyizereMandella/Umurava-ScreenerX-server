const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function getModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.models) {
      console.log(data.models.map(m => m.name).join('\n'));
    } else {
      console.log(data);
    }
  } catch(e) {
    console.log(e);
  }
}
getModels();
