import { GeminiService } from './gemini.service';
import { DeepSeekService } from './deepseek.service';
import { XAiService } from './xai.service';
import { AuditService } from './audit.service';

export class AiOrchestrator {
  /**
   * Universal resume analysis with failover.
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

    // Order of preference: DeepSeek -> Gemini -> xAI
    const providers = [
      { name: 'DeepSeek', service: DeepSeekService },
      { name: 'Gemini', service: GeminiService },
      { name: 'Grok', service: XAiService }
    ];

    let lastError: any = null;

    for (const provider of providers) {
      try {
        console.log(`[AI Orchestrator] Attempting analysis with ${provider.name}...`);
        
        let result;
        if (provider.name === 'Gemini') {
          // Gemini handles URLs/PDFs natively
          result = await GeminiService.analyzeResume(name, jobTitle, skills, answers, resumeUrl, knockoutSkills);
        } else {
          // For DeepSeek/Grok, we pass the context. 
          // Note: In a future iteration, we could extract text from the resumeUrl here.
          result = await (provider.service as any).analyzeResume(name, jobTitle, skills, answers, '', knockoutSkills);
        }

        // Log which AI was used
        await AuditService.logActivity({
          organizationId,
          actionType: 'AI Analysis Success',
          description: `Candidate ${name} analyzed using ${provider.name}`,
        });

        return { ...result, provider: provider.name };
      } catch (error: any) {
        console.error(`[AI Orchestrator] ${provider.name} failed:`, error.message || error);
        lastError = error;
        // Continue to next provider...
      }
    }

    throw new Error(`AI Orchestrator failed: All providers exhausted. Last error: ${lastError?.message}`);
  }

  /**
   * Universal CV parsing and analysis with failover.
   */
  static async parseAndAnalyze(organizationId: string, params: {
    jobTitle: string,
    fileBuffer: Buffer,
    mimeType: string,
    knockoutSkills: string[]
  }) {
    const { jobTitle, fileBuffer, mimeType, knockoutSkills } = params;

    // CV Parsing currently relies on Gemini's native multimodal capabilities.
    // In a production scenario, we'd add a separate PDF-to-text extractor 
    // to allow DeepSeek/Grok to process these as well.
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
      throw error; // Currently we require Gemini for high-fidelity parsing
    }
  }

  /**
   * Universal job baseline generation with failover.
   */
  static async generateJobBaseline(title: string, department?: string) {
    const providers = [
      { name: 'DeepSeek', service: DeepSeekService },
      { name: 'Gemini', service: GeminiService },
      { name: 'Grok', service: XAiService }
    ];

    for (const provider of providers) {
      try {
        return await (provider.service as any).generateJobBaseline(title, department);
      } catch (error: any) {
        console.error(`[AI Orchestrator] ${provider.name} baseline generation failed:`, error.message);
      }
    }

    throw new Error("AI Orchestrator failed to generate job baseline.");
  }

  /**
   * Universal dashboard insight generation.
   */
  static async generateDashboardInsight(orgContext: any) {
    // Insights can fail silently with a default message
    try {
      return await DeepSeekService.generateDashboardInsight(orgContext);
    } catch {
      try {
        return await GeminiService.generateDashboardInsight(orgContext);
      } catch {
        return "Optimize your recruitment funnel by reviewing top matches early.";
      }
    }
  }
}
