import { AgentState } from './graph-state';
import { generatePosts } from './groq-llm';
import { GeneratedPosts } from './types';

/**
 * Generator Node
 * 
 * Synthesizes the gathered information into the final social media posts.
 * Runs after the Executor has completed the plan.
 */
export async function generatorNode(state: AgentState): Promise<Partial<AgentState>> {
    console.log('[Generator] Generating final content...');

    // Extract necessary info
    const lastMessage = state.messages[state.messages.length - 1];
    const goal = lastMessage.content as string;
    const { context, currentArticle } = state;

    // Fallback values if starting from scratch
    const title = currentArticle?.title || goal;
    const source = currentArticle?.source || 'Agent Research';
    const category = 'General'; // Could extract this in planner

    try {
        const generated = await generatePosts(
            title,
            context || 'No context gathered.',
            source,
            category,
            state.plan ? `Followed plan: ${state.plan.steps.map(s => s.instruction).join(', ')}` : undefined,
            state.model // Use selected model
        );

        return {
            generatedContent: {
                xPost: generated.x_post || undefined,
                instagram: generated.instagram_caption || undefined,
                facebook: generated.facebook_post || undefined,
                hashtags: generated.hashtags,
            },
            decision: generated.decision as 'generate' | 'skip' | 'pending'
        };
    } catch (error) {
        console.error('[Generator] Generation failed:', error);
        return {
            decision: 'skip'
        };
    }
}
