import { config } from '../config/env';
import { AppError } from '../utils/AppError';

export class XAiService {
  private static API_URL = 'https://api.x.ai/v1/chat/completions';

  private static async callApi(prompt: string, systemPrompt: string) {
    if (!config.xaiApiKey) {
      throw new AppError('xAI API key is not configured', 500);
    }

    const models = ['grok-beta', 'grok-2', 'grok-vision-beta', 'grok-latest', 'grok-1'];
    let lastError: any = null;

    for (const model of models) {
      try {
        console.log(`[xAI Service] Attempting ${model}...`);
        const response = await fetch(this.API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.xaiApiKey}`
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt }
            ],
            temperature: 0.1
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`xAI API Error (${model}): ${response.statusText} ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        let content = data.choices[0].message.content;
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(content);
      } catch (error: any) {
        console.warn(`[xAI Service] ${model} failed:`, error.message);
        lastError = error;
      }
    }
    throw lastError || new Error("xAI exhausted all models.");
  }

  static async analyzeResume(name: string, jobTitle: string, skills: string[], answers?: Record<string, string>, resumeText?: string, knockoutSkills: string[] = []) {
    const systemPrompt = "You are Grok, an expert AI recruitment evaluator. Respond strictly in JSON.";
    const prompt = `
      Analyze the candidate "${name}" for the role of "${jobTitle}".
      Skills: ${skills.join(', ')}
      Knockout Skills: ${knockoutSkills.join(', ')}
      Answers: ${JSON.stringify(answers)}
      Resume Content: ${resumeText || 'No resume text provided.'}

      Schema:
      {
        "technical_dna": ["string"],
        "algorithmic_fit_score": number,
        "architecture_score": number,
        "strengths": ["string"],
        "gaps": ["string"],
        "recommendation_summary": "string",
        "match_score": number,
        "is_knocked_out": boolean,
        "missing_knockout_skills": ["string"],
        "experience": [{ "company": "string", "role": "string", "duration": "string", "summary": "string" }],
        "education": [{ "institution": "string", "degree": "string", "year": "string" }]
      }
    `;

    return this.callApi(prompt, systemPrompt);
  }

  static async generateJobBaseline(title: string, department?: string) {
    const systemPrompt = "You are Grok, an expert AI recruitment strategist. Respond strictly in JSON.";
    const prompt = `
      Generate ideal candidate baseline for "${title}" in "${department || 'General'}".
      Schema:
      {
        "technical_depth": "string",
        "industry_fit": "string",
        "precision": number,
        "requirements": ["string"],
        "ai_questions": [{ "id": "string", "question": "string", "hint": "string" }],
        "market_intelligence": { "avg_salary": "string", "availability": "string", "time_to_hire": "string" }
      }
    `;

    return this.callApi(prompt, systemPrompt);
  }

  static async generateDashboardInsight(orgContext: any) {
    const systemPrompt = "You are Grok, an expert AI recruitment advisor. Respond with a single sentence.";
    const prompt = `Context: ${JSON.stringify(orgContext)}. Give one actionable tip.`;
    
    if (!config.xaiApiKey) return "Add xAI API key for more insights.";
    
    const res = await this.callApi(prompt, systemPrompt);
    return res.insight || res;
  }
}
