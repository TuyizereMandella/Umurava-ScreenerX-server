const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function test() {
  try {
    // There is no listModels method in the generic SDK?
    // Let's try calling generateContent with gemini-1.5-flash
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent('Hi');
    console.log(result.response.text());
  } catch (error) {
    console.error('Error with gemini-1.5-flash:', error.message);
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
    const result = await model.generateContent('Hi');
    console.log('gemini-1.5-flash-latest success!');
  } catch (error) {
    console.error('Error with gemini-1.5-flash-latest:', error.message);
  }
}

test();
