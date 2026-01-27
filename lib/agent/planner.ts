import { AgentState } from './graph-state';
import { generatePlan } from './groq-llm';

/**
 * Planner Node
 * 
 * Responsible for breaking down the user request into actionable steps.
 * This runs at the start of the Deep Agent flow.
 */
export async function plannerNode(state: AgentState): Promise<Partial<AgentState>> {
    console.log('[Planner] Starting planning phase...');

    // 1. Extract Goal and Context
    const lastMessage = state.messages[state.messages.length - 1];
    const goal = lastMessage.content as string;

    // Build context from article or previous research
    let context = '';
    if (state.currentArticle) {
        context += `Current Article: ${state.currentArticle.title}\n${state.currentArticle.snippet}\n`;
    }
    if (state.context) {
        context += `\nExisting Context:\n${state.context}`;
    }

    // 2. Generate Plan
    try {
        const plan = await generatePlan(goal, context, state.model);

        console.log(`[Planner] Generated plan with ${plan.steps.length} steps.`);
        plan.steps.forEach(s => console.log(`  - ${s.id}: ${s.instruction} (${s.tool})`));

        return {
            plan,
            currentStep: 0,
            // Clear previous reflections if starting fresh
            reflections: [],
        };
    } catch (error) {
        console.error('[Planner] Failed to generate plan:', error);
        // Fallback or error handling
        return {
            decision: 'skip', // Or handle gracefully
        };
    }
}
