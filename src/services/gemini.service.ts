import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env';
import { AppError } from '../utils/AppError';

export class GeminiService {
  private static getModel(modelName = 'gemini-1.5-flash') {
    const genAI = new GoogleGenerativeAI(config.geminiApiKey);
    return genAI.getGenerativeModel({ model: modelName });
  }

  static async analyzeResume(name: string, jobTitle: string, skills: string[], resumeText?: string) {
    if (!config.geminiApiKey) {
      throw new AppError('Gemini API key is not configured', 500);
    }
    const model = this.getModel();
    
    const prompt = `
      You are ScreenerX, an expert AI recruitment evaluator.
      Analyze the candidate "${name}" for the role of "${jobTitle}".
      Candidate skills: ${skills.join(', ')}
      Resume/Context: ${resumeText || 'No detailed resume provided, base analysis on the name and job title realistically.'}
      
      Respond strictly in JSON format matching this schema:
      {
        "technical_dna": ["string", "string"], // 3-5 core technical skills or attributes
        "algorithmic_fit_score": number, // 0-100
        "architecture_score": number, // 0-100
        "strengths": ["string", "string"], // 2-3 key strengths
        "gaps": ["string", "string"], // 1-2 potential gaps
        "recommendation_summary": "string", // 2-3 sentences max
        "match_score": number // overall match 0-100
      }
      Only return the JSON. No markdown fences.
    `;

    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(responseText);
    } catch (error: any) {
      console.error('Gemini API Error:', error);
      throw new AppError('Failed to analyze candidate with AI', 500);
    }
  }

  static async generateJobBaseline(title: string, department?: string) {
    if (!config.geminiApiKey) {
      throw new AppError('Gemini API key is not configured', 500);
    }
    const model = this.getModel();
    
    const prompt = `
      You are ScreenerX, an expert AI recruitment strategist.
      Generate an ideal candidate baseline for the role of "${title}" in the "${department || 'General'}" department.
      
      Respond strictly in JSON format matching this schema:
      {
        "technical_depth": "string", // 1-2 sentences
        "industry_fit": "string", // 1-2 sentences
        "precision": number, // 80-99
        "market_intelligence": {
          "avg_salary": "string", // e.g., "$120k - $150k"
          "availability": "string", // "Low", "Medium", "High"
          "time_to_hire": "string" // e.g., "30 Days"
        }
      }
      Only return the JSON. No markdown fences.
    `;

    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(responseText);
    } catch (error: any) {
      console.error('Gemini API Error:', error);
      throw new AppError('Failed to generate job baseline with AI', 500);
    }
  }

  static async generateDashboardInsight(orgContext: any) {
    if (!config.geminiApiKey) {
      return "Ensure your GEMINI_API_KEY is set in production to receive personalized insights.";
    }
    const model = this.getModel();
    
    const prompt = `
      You are ScreenerX, an expert AI recruitment advisor.
      Based on the following organizational context:
      - Job Count: ${orgContext.jobCount}
      - Total Applicants: ${orgContext.totalApplicants}
      - Top Job: ${orgContext.topJobTitle}

      Generate a single, short (max 2 sentences) actionable insight or tip for the recruiter. Do not use JSON.
    `;

    try {
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (error: any) {
      console.error('Gemini API Error:', error);
      return "Market dynamics are shifting rapidly. Maintain competitive compensation to attract top talent.";
    }
  }
}
