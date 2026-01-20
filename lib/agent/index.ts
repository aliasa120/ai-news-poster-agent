/**
 * Agent Module - Clean Public API
 * 
 * This is the main entry point for the agent.
 * All internal modules are re-exported here for clean imports.
 */

// ============= PUBLIC API =============

export { runAgent, cancelAgent } from './runner';

// ============= TYPES =============

export type { AgentRun, AgentError, ToolCall, AgentQueueItem, AgentSettings } from './types';

// ============= STORE OPERATIONS =============

export {
    getAgentSettings,
    getActiveRun,
} from './store';
