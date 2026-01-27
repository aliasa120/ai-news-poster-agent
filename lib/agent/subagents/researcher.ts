
import { serperSearchTool, newsSearchTool, jinaReaderTool } from '../tools/langchain-tools';
import { SubAgent, runSubagent } from './core';

/**
 * RESEARCH SKILL DEFINITION
 * Modular configuration for the Research Subagent
 */
export const ResearchSkill: SubAgent = {
    name: 'research-specialist',
    description: 'Conducts in-depth research and synthesizes findings.',
    systemPrompt: `You are a Research Specialist Subagent.
Your goal is to analyze the provided Raw Data and extract the key information relevant to the user's research topic.

INSTRUCTIONS:
1. Synthesize the raw data into a clear, concise summary.
2. Extract specific facts, numbers, dates, and quotes.
3. Ignore irrelevant boilerplate, ads, or navigation text.
4. Provide source citations (Source X) where possible.

OUTPUT FORMAT:
## Executive Summary
(2-3 sentences summarizing the core answer)

## Key Findings
- (Bullet point with fact/number) [Source X]
- (Bullet point with fact/number) [Source Y]

## Sources
- Source 1: [Title/URL]
- Source 2: [Title/URL]

LENGTH LIMIT: Keep the total response under 400 words.`,
    tools: []
};

/**
 * Research Subagent Entry Point
 * 
 * Orchestrates the data gathering + synthesis using the Research Skill.
 */
export async function researchSubagent(
    instruction: string,
    type: 'web' | 'news' | 'url',
    model?: string
): Promise<string> {
    console.log(`[ResearchSubagent] Started task: ${instruction} (${type})`);

    let rawData = '';

    // Step 1: Gather Raw Data (High Volume)
    try {
        if (type === 'web') {
            rawData = await serperSearchTool.invoke({ query: instruction });
        } else if (type === 'news') {
            rawData = await newsSearchTool.invoke({ query: instruction });
        } else if (type === 'url') {
            rawData = await jinaReaderTool.invoke({ url: instruction });
        }
    } catch (error: any) {
        return `Subagent failed to gather data: ${error.message}`;
    }

    if (!rawData || rawData.length < 50) {
        return "No significant data found to analyze.";
    }

    console.log(`[ResearchSubagent] Raw data gathered: ${rawData.length} chars. Delegating to [${ResearchSkill.name}] for synthesis...`);

    // Step 2: Synthesize (Context Quarantine) using the Skill Definition
    return await runSubagent(ResearchSkill, `RESEARCH TOPIC: ${instruction}`, rawData, model);
}
