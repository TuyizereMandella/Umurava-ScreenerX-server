import { GeminiService } from './gemini.service';
import { AuditService } from './audit.service';

export class AiOrchestrator {
  /**
   * Universal resume analysis using Gemini.
   */
  static async analyzeResume(organizationId: string, params: {
    name: string,
    jobTitle: string,
    skills: string[],
    answers?: Record<string, string>,
    resumeUrl?: string,
    knockoutSkills: string[]
  }) {
    const { name, jobTitle, skills, answers, resumeUrl, knockoutSkills } = params;

    try {
      console.log(`[AI Orchestrator] Attempting analysis with Gemini...`);
      
      const result = await GeminiService.analyzeResume(name, jobTitle, skills, answers, resumeUrl, knockoutSkills);

      // Log which AI was used
      await AuditService.logActivity({
        organizationId,
        actionType: 'AI Analysis Success',
        description: `Candidate ${name} analyzed using Gemini`,
      });

      return { ...result, provider: 'Gemini' };
    } catch (error: any) {
      console.error(`[AI Orchestrator] Gemini failed:`, error.message || error);
      throw error;
    }
  }

  /**
   * Universal CV parsing and analysis using Gemini.
   */
  static async parseAndAnalyze(organizationId: string, params: {
    jobTitle: string,
    fileBuffer: Buffer,
    mimeType: string,
    knockoutSkills: string[]
  }) {
    const { jobTitle, fileBuffer, mimeType, knockoutSkills } = params;

    try {
      console.log(`[AI Orchestrator] Attempting CV Parse with Gemini...`);
      const result = await GeminiService.parseAndAnalyze(jobTitle, fileBuffer, mimeType, knockoutSkills);
      
      await AuditService.logActivity({
        organizationId,
        actionType: 'AI CV Parse Success',
        description: `Imported and parsed candidate CV using Gemini`,
      });

      return { ...result, provider: 'Gemini' };
    } catch (error: any) {
      console.error(`[AI Orchestrator] Gemini CV Parse failed:`, error.message);
      throw error;
    }
  }

  /**
   * Universal job baseline generation using Gemini.
   */
  static async generateJobBaseline(title: string, department?: string) {
    try {
      return await GeminiService.generateJobBaseline(title, department);
    } catch (error: any) {
      console.error(`[AI Orchestrator] Gemini baseline generation failed:`, error.message);
      throw new Error("AI Orchestrator failed to generate job baseline.");
    }
  }

  /**
   * Universal dashboard insight generation using Gemini.
   */
  static async generateDashboardInsight(orgContext: any) {
    try {
      return await GeminiService.generateDashboardInsight(orgContext);
    } catch {
      return "Optimize your recruitment funnel by reviewing top matches early.";
    }
  }
}

