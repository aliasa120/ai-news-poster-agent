/**
 * Agent Factory - LangChain Agent Creation
 * 
 * Creates the LangGraph React agent with configured LLM and tools.
 */

import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { getAgentTools } from './tools/langchain-tools';
import { createLLM } from './providers';

/**
 * Create a news processing agent with the specified model
 */
export function createNewsAgent(modelId: string) {
    const llm = createLLM(modelId);
    const tools = getAgentTools();

    return createReactAgent({
        llm,
        tools,
    });
}

/**
 * Type for the agent returned by createNewsAgent
 */
export type NewsAgent = ReturnType<typeof createNewsAgent>;
