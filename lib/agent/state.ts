/**
 * Agent State Management
 * 
 * Manages global agent state including abort controller, run ID, and LangGraph memory.
 * 
 * LangGraph Enhancement:
 * - MemorySaver provides checkpointing for agent runs
 * - Thread ID maps to our runId for conversation tracking
 */

import { MemorySaver } from '@langchain/langgraph';

// ============= LANGGRAPH MEMORY =============

/**
 * LangGraph MemorySaver for checkpointing
 * This enables:
 * - Persistent memory across agent steps
 * - Resumable agent runs
 * - Conversation history tracking
 */
const checkpointer = new MemorySaver();

export function getCheckpointer(): MemorySaver {
    return checkpointer;
}

// ============= STATE =============

let currentAbortController: AbortController | null = null;
let currentRunId: string | null = null;

// ============= GETTERS =============

export function getAbortController(): AbortController | null {
    return currentAbortController;
}

export function getRunId(): string | null {
    return currentRunId;
}

export function isAborted(): boolean {
    return currentAbortController?.signal.aborted ?? false;
}

/**
 * Get LangGraph config with thread_id for checkpointing
 * This maps our runId to LangGraph's thread_id
 */
export function getLangGraphConfig() {
    return {
        configurable: {
            thread_id: currentRunId || 'default',
        },
    };
}

// ============= SETTERS =============

export function setAbortController(controller: AbortController | null): void {
    currentAbortController = controller;
}

export function setRunId(runId: string | null): void {
    currentRunId = runId;
}

export function createNewAbortController(): AbortController {
    currentAbortController = new AbortController();
    return currentAbortController;
}

// ============= CLEANUP =============

export function cleanup(): void {
    currentAbortController = null;
    currentRunId = null;
}

// ============= HELPERS =============

/**
 * Delay with abort support
 */
export function delay(ms: number): Promise<void> {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, ms);
        currentAbortController?.signal.addEventListener('abort', () => {
            clearTimeout(timeout);
            reject(new Error('Aborted'));
        }, { once: true });
    });
}

/**
 * Abort the current run
 */
export function abort(): void {
    currentAbortController?.abort();
}
