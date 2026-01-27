import { AgentState } from './graph-state';
import { reflectOnPost } from './groq-llm';

/**
 * Reflector Node
 * 
 * Reviews the generated content and provides feedback.
 * If quality is low, this feedback drives the next iteration.
 */
export async function reflectorNode(state: AgentState): Promise<Partial<AgentState>> {
    const { generatedContent, messages, context } = state;

    if (!generatedContent) {
        console.log('[Reflector] No content to reflect on.');
        return {};
    }

    const lastMessage = messages[messages.length - 1];
    const goal = lastMessage.content as string;

    console.log('[Reflector] Reflecting on generated content...');

    try {
        const reflection = await reflectOnPost(goal, generatedContent, context || '', state.model);

        console.log(`[Reflector] Score: ${reflection.score}/10. Satisfactory: ${reflection.is_satisfactory}`);
        if (!reflection.is_satisfactory) {
            console.log(`[Reflector] Critique: ${reflection.critique}`);
        }

        return {
            reflections: [...(state.reflections || []), reflection]
        };
    } catch (error) {
        console.error('[Reflector] Reflection failed:', error);
        return {};
    }
}
