/**
 * LLM Provider Abstraction
 * Supports both Groq and Cerebras providers using LangChain
 * Cerebras uses OpenAI-compatible API
 */

import { ChatGroq } from '@langchain/groq';
import { ChatOpenAI } from '@langchain/openai';

// Model definitions with provider info
export interface ModelConfig {
    id: string;
    name: string;
    provider: 'groq' | 'cerebras';
    description: string;
    apiModelName: string; // Actual model name for API
}

export const AVAILABLE_MODELS: ModelConfig[] = [
    // Groq Models
    {
        id: 'groq-gpt-oss-120b',
        name: 'GPT-OSS 120B (Groq)',
        provider: 'groq',
        description: 'Powerful reasoning model',
        apiModelName: 'gpt-oss-120b',
    },
    {
        id: 'groq-llama-3.3-70b',
        name: 'Llama 3.3 70B (Groq)',
        provider: 'groq',
        description: 'Balanced performance',
        apiModelName: 'llama-3.3-70b-versatile',
    },
    {
        id: 'groq-llama-3.1-8b',
        name: 'Llama 3.1 8B (Groq)',
        provider: 'groq',
        description: 'Fast, lightweight',
        apiModelName: 'llama-3.1-8b-instant',
    },
    // Cerebras Models (OpenAI-compatible)
    {
        id: 'cerebras-gpt-oss-120b',
        name: 'GPT-OSS 120B (Cerebras)',
        provider: 'cerebras',
        description: 'Ultra-fast inference (2200 tok/s)',
        apiModelName: 'gpt-oss-120b',
    },
    {
        id: 'cerebras-llama-3.3-70b',
        name: 'Llama 3.3 70B (Cerebras)',
        provider: 'cerebras',
        description: 'Fast Llama (1100 tok/s)',
        apiModelName: 'llama-3.3-70b',
    },
];

// Get model config by ID
export function getModelConfig(modelId: string): ModelConfig | undefined {
    return AVAILABLE_MODELS.find(m => m.id === modelId);
}

// Get provider for a model
export function getProviderForModel(modelId: string): 'groq' | 'cerebras' {
    const model = AVAILABLE_MODELS.find(m => m.id === modelId);
    return model?.provider || 'groq';
}

// Create LLM instance based on provider
export function createLLM(modelId: string) {
    const config = getModelConfig(modelId);

    if (!config) {
        // Fallback to Groq with the raw model ID
        console.log(`[Provider] Unknown model ${modelId}, falling back to Groq`);
        return new ChatGroq({
            apiKey: process.env.GROQ_API_KEY,
            model: modelId,
            temperature: 0.3,
        });
    }

    if (config.provider === 'cerebras') {
        // Use ChatOpenAI with Cerebras base URL (OpenAI-compatible)
        console.log(`[Provider] Using Cerebras for ${config.name}`);
        return new ChatOpenAI({
            apiKey: process.env.CEREBRAS_API_KEY,
            model: config.apiModelName,
            temperature: 0.3,
            configuration: {
                baseURL: 'https://api.cerebras.ai/v1',
            },
        });
    }

    // Default: Groq
    console.log(`[Provider] Using Groq for ${config.name}`);
    return new ChatGroq({
        apiKey: process.env.GROQ_API_KEY,
        model: config.apiModelName,
        temperature: 0.3,
    });
}

// Export model list for UI
export function getModelOptions() {
    return AVAILABLE_MODELS.map(m => ({
        id: m.id,
        name: m.name,
        description: m.description,
        provider: m.provider,
    }));
}
