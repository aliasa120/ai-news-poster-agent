import { Annotation, MessagesAnnotation } from '@langchain/langgraph';
import { BaseMessage } from '@langchain/core/messages';
import { AgentPlan, Reflection } from './types';

// ============= AGENT STATE ANNOTATION =============

/**
 * Agent processing state using LangGraph Annotation
 * 
 * Extends MessagesAnnotation with custom fields for news processing.
 * 
 * @field messages - Chat history (from MessagesAnnotation)
 * @field currentArticle - The article being processed
 * @field tier - Processing tier (1-4)
 * @field toolsUsed - List of tools called
 * @field decision - Final decision (generate/skip)
 * @field plan - Deep Agent Plan
 * @field currentStep - Current step index
 * @field context - Accumulated research context
 * @field reflections - Self-correction history
 */
export const AgentStateAnnotation = Annotation.Root({
    // Inherit messages from MessagesAnnotation  
    ...MessagesAnnotation.spec,

    // Current article context
    currentArticle: Annotation<{
        id: string;
        title: string;
        source: string;
        url: string;
        snippet: string;
    } | null>({
        default: () => null,
        reducer: (_, update) => update,
    }),

    // Processing tier (1-4) - KEEPING FOR COMPATIBILITY
    tier: Annotation<1 | 2 | 3 | 4>({
        default: () => 1,
        reducer: (_, update) => update,
    }),

    // Model ID
    model: Annotation<string>({
        default: () => 'moonshotai/kimi-k2-instruct-0905',
        reducer: (_, update) => update,
    }),

    // Tools used during processing
    toolsUsed: Annotation<string[]>({
        default: () => [],
        reducer: (current, update) => [...current, ...update],
    }),

    // Final decision
    decision: Annotation<'pending' | 'generate' | 'skip'>({
        default: () => 'pending',
        reducer: (_, update) => update,
    }),

    // Generated content
    generatedContent: Annotation<{
        xPost?: string;
        instagram?: string;
        facebook?: string;
        hashtags?: string[];
    } | null>({
        default: () => null,
        reducer: (_, update) => update,
    }),

    // === DEEP AGENT FIELDS ===

    plan: Annotation<AgentPlan | null>({
        default: () => null,
        reducer: (_, update) => update,
    }),

    currentStep: Annotation<number>({
        default: () => 0,
        reducer: (_, update) => update,
    }),

    // Shared context buffer (like a fast filesystem)
    context: Annotation<string>({
        default: () => '',
        reducer: (current, update) => current + '\n' + update,
    }),

    reflections: Annotation<Reflection[]>({
        default: () => [],
        reducer: (current, update) => [...current, ...update],
    }),
});

/**
 * Type for the agent state
 */
export type AgentState = typeof AgentStateAnnotation.State;

/**
 * Initial state helper
 */
export function createInitialState(article: {
    id: string;
    title: string;
    source: string;
    url: string;
    snippet: string;
}, model?: string): Partial<AgentState> {
    return {
        messages: [],
        currentArticle: article,
        tier: 1,
        model: model || 'moonshotai/kimi-k2-instruct-0905',
        toolsUsed: [],
        decision: 'pending',
        generatedContent: null,
        plan: null,
        currentStep: 0,
        context: '',
        reflections: [],
    };
}
