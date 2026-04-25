const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

console.log("Key length:", process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function test() {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent('Say hello');
    console.log("Success! Response:", result.response.text());
  } catch (error) {
    console.error('Error with new key:', error);
  }
}

test();
