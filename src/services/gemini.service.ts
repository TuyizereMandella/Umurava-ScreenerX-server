import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env';
import { AppError } from '../utils/AppError';

export class GeminiService {
  private static getModel(modelName = 'gemini-2.5-flash') {
    const genAI = new GoogleGenerativeAI(config.geminiApiKey);
    return genAI.getGenerativeModel({ model: modelName });
  }

  static async analyzeResume(name: string, jobTitle: string, skills: string[], answers?: Record<string, string>, resumeUrl?: string) {
    if (!config.geminiApiKey) {
      throw new AppError('Gemini API key is not configured', 500);
    }
    const model = this.getModel();
    
    let resumePart: any = null;
    if (resumeUrl) {
      try {
        const response = await fetch(resumeUrl);
        const buffer = await response.arrayBuffer();
        resumePart = {
          inlineData: {
            data: Buffer.from(buffer).toString('base64'),
            mimeType: 'application/pdf'
          }
        };
      } catch (err) {
        console.error('Failed to fetch resume for analysis:', err);
      }
    }

    const prompt = `
      You are ScreenerX, an expert AI recruitment evaluator.
      Analyze the candidate "${name}" for the role of "${jobTitle}".
      Candidate skills: ${skills.join(', ')}
      Candidate Custom Answers: ${answers ? JSON.stringify(answers) : 'None provided'}
      ${resumePart ? 'A resume PDF has been provided for your review. Extract all relevant details from it.' : 'No detailed resume provided, base analysis on the name, job title, and their custom answers.'}
      
      Respond strictly in JSON format matching this schema:
      {
        "technical_dna": ["string", "string"], // 3-5 core technical skills or attributes
        "algorithmic_fit_score": number, // 0-100 (be critical, avoid generic high scores unless truly deserved)
        "architecture_score": number, // 0-100 (be critical, avoid generic high scores)
        "strengths": ["string", "string"], // 2-3 key strengths
        "gaps": ["string", "string"], // 1-2 potential gaps
        "recommendation_summary": "string", // 2-3 sentences max
        "match_score": number, // overall match 0-100 (be critical, distinguish between good and bad candidates)
        "experience": [
          { "company": "string", "role": "string", "duration": "string", "summary": "string" }
        ],
        "education": [
          { "institution": "string", "degree": "string", "year": "string" }
        ]
      }
      Only return the JSON. No markdown fences.
    `;

    try {
      const contents = resumePart 
        ? [prompt, resumePart]
        : [prompt];
        
      const result = await model.generateContent(contents);
      const responseText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(responseText);
    } catch (error: any) {
      console.error('Gemini API Error:', error);
      // Fallback for 429 Too Many Requests or other API errors
      return {
        technical_dna: ["General Engineering", "Adaptability"],
        algorithmic_fit_score: 50,
        architecture_score: 50,
        strengths: ["Willingness to learn"],
        gaps: ["No detailed analysis available due to provider quota"],
        recommendation_summary: "Manual review required. AI provider temporarily unavailable.",
        match_score: 50,
        experience: [],
        education: []
      };
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
        "requirements": ["string", "string", "string"], // 3-4 key bullet points for the role
        "ai_questions": [
          { "id": "q1", "question": "string", "hint": "string" },
          { "id": "q2", "question": "string", "hint": "string" }
        ],
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
      // Fallback for 429 Too Many Requests or other API errors
      return {
        technical_depth: "Extensive experience required in relevant technical domains and frameworks.",
        industry_fit: "Strong understanding of industry best practices and modern methodologies.",
        precision: 85,
        requirements: [
          "Proven track record of delivering high-quality results in a similar role.",
          "Strong problem-solving, communication, and collaboration skills.",
          "Ability to adapt to fast-paced environments and learn new technologies quickly."
        ],
        ai_questions: [
          { "id": "q1", "question": "Describe a complex challenge you recently solved. What was your approach?", "hint": "Focus on your specific contribution and the ultimate outcome." },
          { "id": "q2", "question": "How do you prioritize your work when facing multiple urgent deadlines?", "hint": "Mention any frameworks or specific strategies you rely on." }
        ],
        market_intelligence: {
          avg_salary: "Competitive",
          availability: "Medium",
          time_to_hire: "30-45 Days"
        }
      };
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

  static async parseAndAnalyze(jobTitle: string, fileBuffer: Buffer, mimeType: string) {
    if (!config.geminiApiKey) {
      throw new AppError('Gemini API key is not configured', 500);
    }
    const model = this.getModel();

    const resumePart = {
      inlineData: {
        data: fileBuffer.toString('base64'),
        mimeType: mimeType
      }
    };

    const prompt = `
      You are ScreenerX, an expert AI recruitment orchestrator.
      Analyze the provided resume for the role of "${jobTitle}".
      
      Extract and analyze everything. Respond strictly in JSON format matching this schema:
      {
        "personal_details": {
          "name": "string",
          "email": "string",
          "phone": "string",
          "location": "string",
          "linkedin_url": "string",
          "github_url": "string"
        },
        "analysis": {
          "technical_dna": ["string", "string"], 
          "algorithmic_fit_score": number, 
          "architecture_score": number, 
          "strengths": ["string", "string"], 
          "gaps": ["string", "string"], 
          "recommendation_summary": "string", 
          "match_score": number,
          "experience": [
            { "company": "string", "role": "string", "duration": "string", "summary": "string" }
          ],
          "education": [
            { "institution": "string", "degree": "string", "year": "string" }
          ]
        }
      }
      Be critical with scores. Only return the JSON. No markdown fences.
    `;

    try {
      const result = await model.generateContent([prompt, resumePart]);
      const responseText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(responseText);
    } catch (error: any) {
      console.error('Gemini Parse Error:', error);
      throw new AppError('AI failed to parse and analyze the document. Please try again.', 500);
    }
  }
}
