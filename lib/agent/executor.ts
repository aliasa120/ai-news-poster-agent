import { AgentState } from './graph-state';
import { serperSearchTool, newsSearchTool, jinaReaderTool, getAgentTools } from './tools/langchain-tools';
import { researchSubagent } from './subagents/researcher';

/**
 * Executor Node
 * 
 * Executes the current step of the plan.
 * Acts as a sub-agent that calls tools and reports back.
 */
export async function executorNode(state: AgentState): Promise<Partial<AgentState>> {
    const { plan, currentStep } = state;

    if (!plan || !plan.steps || currentStep >= plan.steps.length) {
        console.log('[Executor] Plan complete or invalid.');
        return { currentStep }; // No-op, will transition to Reflector/Generato
    }

    const step = plan.steps[currentStep];
    console.log(`[Executor] Executing step ${currentStep + 1}/${plan.steps.length}: ${step.instruction} (${step.tool})`);

    // Update step status to active
    // Note: We can't deeply mutate 'plan' in LangGraph state easily without a reducer that merges.
    // Ideally we'd return a new plan object.
    const newSteps = [...plan.steps];
    newSteps[currentStep] = { ...step, status: 'active' };

    let resultData = '';
    let success = false;

    try {
        switch (step.tool) {
            case 'search_web':
                // Instruction is the query
                // Instruction is the query - cleaning up common LLM prefixes
                const cleanQuery = step.instruction
                    .replace(/search_web/gi, '')
                    .replace(/search_news/gi, '')
                    .replace(/query/gi, '')
                    .replace(/"/g, '')
                    .replace(/^:/, '')
                    .trim();

                // DELEGATION: Call Research Subagent for optimized context usage
                // DELEGATION: Call Research Subagent for optimized context usage
                resultData = await researchSubagent(cleanQuery, 'web', state.model);
                success = true;
                break;

            case 'search_news':
                const cleanNewsQuery = step.instruction
                    .replace(/search_web/gi, '')
                    .replace(/search_news/gi, '')
                    .replace(/query/gi, '')
                    .replace(/"/g, '')
                    .replace(/^:/, '')
                    .trim();

                // DELEGATION: Call Research Subagent
                // DELEGATION: Call Research Subagent
                resultData = await researchSubagent(cleanNewsQuery, 'news', state.model);
                success = true;
                break;


            case 'read_article':
                // Instruction is the URL - try to extract if mixed with text
                const urlMatch = step.instruction.match(/(https?:\/\/[^\s]+)/);
                const urlToRead = urlMatch ? urlMatch[0] : step.instruction;

                // DELEGATION: Call Research Subagent
                // DELEGATION: Call Research Subagent
                resultData = await researchSubagent(urlToRead, 'url', state.model);
                success = true;
                break;

            case 'none':
                // Just a thought step or compile step
                resultData = "Step completed internally.";
                success = true;
                break;

            default:
                resultData = "Unknown tool requested.";
                success = false;
        }
    } catch (error: any) {
        console.error(`[Executor] Step failed: ${error.message}`);
        resultData = `Error executing step: ${error.message}`;
        success = false;
    }

    // Update step with result
    newSteps[currentStep] = {
        ...step,
        status: success ? 'completed' : 'failed',
        result: resultData
    };

    console.log(`[Executor] Step result logic complete. Success: ${success}`);

    return {
        plan: { ...plan, steps: newSteps },
        currentStep: currentStep + 1,
        // Append result to context so future steps (and generator) can see it
        // Truncate result to avoid token overflow (keep most relevant parts)
        context: `\n### Step ${currentStep + 1}: ${step.instruction}\nResult:\n${resultData.slice(0, 10000)}...\n`,
    };
}
