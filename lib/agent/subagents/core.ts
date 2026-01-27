
import { Groq } from 'groq-sdk';
import { DynamicStructuredTool } from '@langchain/core/tools';

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

/**
 * SubAgent Configuration Interface
 * Defines a specialized "Skill" or "Subagent"
 */
export interface SubAgent {
    name: string;
    description: string;
    systemPrompt: string;
    tools: DynamicStructuredTool[];
    model?: string; // Optional override
}

/**
 * Run a Subagent
 * 
 * 1. Sets up the subagent context
 * 2. Runs the tools if necessary (or lets the specific runner handle it)
 * 3. Calls the LLM to synthesize/process logic based on the system prompt
 */
export async function runSubagent(
    subagent: SubAgent,
    userInput: string,
    contextData: string = '',
    model: string = 'moonshotai/kimi-k2-instruct-0905'
): Promise<string> {
    console.log(`[SubAgent:${subagent.name}] Running...`);

    const finalModel = subagent.model || model;

    const response = await groq.chat.completions.create({
        model: finalModel,
        messages: [
            {
                role: 'system',
                content: `${subagent.systemPrompt}
                
AVAILABLE TOOLS:
${subagent.tools.map(t => `- ${t.name}: ${t.description}`).join('\n')}
`
            },
            {
                role: 'user',
                content: `${userInput}

CONTEXT DATA:
${contextData}`
            }
        ],
        temperature: 0.3,
        max_completion_tokens: 1500,
    });

    const result = response.choices[0]?.message?.content || "Subagent failed to produce output.";
    console.log(`[SubAgent:${subagent.name}] Completed.`);

    return result;
}
