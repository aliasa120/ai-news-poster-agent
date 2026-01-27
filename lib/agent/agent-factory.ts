/**
 * Agent Factory - LangChain Agent Creation
 * 
 * Creates the LangGraph React agent with configured LLM, tools, and checkpointer.
 * 
 * LangGraph Enhancement:
 * - Uses MemorySaver checkpointer for state persistence
 * - Enables thread-based conversation tracking
 */

import { StateGraph, START, END } from '@langchain/langgraph';
import { AgentStateAnnotation, AgentState } from './graph-state';
import { plannerNode } from './planner';
import { executorNode } from './executor';
import { generatorNode } from './generator';
import { reflectorNode } from './reflector';
import { getCheckpointer } from './state';

/**
 * Create a Deep Agent with the specified model
 * 
 * Features:
 * - Plan-and-Execute Architecture
 * - Deep Research with multi-provider fallback
 * - Self-correction via Reflection
 */
export function createNewsAgent(modelId: string) {
    const checkpointer = getCheckpointer();

    // Define the graph
    const workflow = new StateGraph(AgentStateAnnotation)
        .addNode('planner', plannerNode)
        .addNode('executor', executorNode)
        .addNode('generator', generatorNode)
        .addNode('reflector', reflectorNode)

        // Flow
        .addEdge(START, 'planner')
        .addEdge('planner', 'executor')

        // Executor Loop
        .addConditionalEdges(
            'executor',
            (state) => {
                const { plan, currentStep } = state;
                if (!plan || !plan.steps) return 'generator'; // Fallback
                if (currentStep < plan.steps.length) {
                    return 'executor'; // Continue loop
                }
                return 'generator'; // Done
            }
        )

        .addEdge('generator', 'reflector')
        .addEdge('reflector', END);

    // Compile
    return workflow.compile({
        checkpointer,
    });
}

/**
 * Type for the agent returned by createNewsAgent
 */
export type NewsAgent = ReturnType<typeof createNewsAgent>;

