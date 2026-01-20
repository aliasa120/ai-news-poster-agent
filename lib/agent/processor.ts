/**
 * Article Processor
 * 
 * Handles individual article processing through the LangChain agent.
 */

import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { NewsItem } from '../types';
import { AgentQueueItem, ToolCall } from './types';
import { NewsAgent } from './agent-factory';
import { SYSTEM_PROMPT, buildUserMessage } from './prompts';
import { parseAgentResponse, createFallbackPosts, forceGeneration, extractPosts, GeneratedPosts } from './parser';
import { getAbortController, isAborted } from './state';
import { updateQueueItem, markNewsItemProcessed, logActivity } from './store';

// ============= TYPES =============

export interface ProcessResult {
    skipped: boolean;
    generated: boolean;
    tierUsed: 1 | 2 | 3 | 4;
    toolCalls: number;
    reasoning?: string;
}

// ============= STREAM HANDLER =============

interface StreamResult {
    finalContent: string;
    toolsUsed: string[];
    toolCalls: ToolCall[];
}

/**
 * Stream agent response and track tool calls
 */
async function streamAgentResponse(
    agent: NewsAgent,
    article: NewsItem,
    runId: string
): Promise<StreamResult> {
    const userMessage = buildUserMessage(article);
    const toolCalls: ToolCall[] = [];
    const toolsUsed: string[] = [];
    let finalContent = '';

    const stream = await agent.stream(
        {
            messages: [
                new SystemMessage(SYSTEM_PROMPT),
                new HumanMessage(userMessage),
            ],
        },
        {
            recursionLimit: 25,
            signal: getAbortController()?.signal,
        }
    );

    for await (const event of stream) {
        if (isAborted()) {
            throw new Error('Aborted');
        }

        // Handle agent events (tool calls initiated)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const agentEvent = event as any;
        if (agentEvent.agent) {
            const msgs = agentEvent.agent.messages;
            const messagesArray = Array.isArray(msgs) ? msgs : [msgs];
            const lastMsg = messagesArray[messagesArray.length - 1];

            if (lastMsg?.tool_calls?.length > 0) {
                for (const tc of lastMsg.tool_calls) {
                    console.log(`[Tool] ${tc.name}`);
                    await logToolCall(runId, article.title, tc.name);

                    toolsUsed.push(tc.name);
                    toolCalls.push({
                        tool: tc.name as ToolCall['tool'],
                        input: JSON.stringify(tc.args).slice(0, 200),
                        timestamp: new Date().toISOString(),
                    });
                }
            }

            // Capture final content
            if (lastMsg?.content && typeof lastMsg.content === 'string' && lastMsg.content.includes('{')) {
                finalContent = lastMsg.content;
            }
        }

        // Handle tool execution results
        if (agentEvent.tools) {
            const toolMsgs = agentEvent.tools.messages;
            const toolMessagesArray = Array.isArray(toolMsgs) ? toolMsgs : (toolMsgs ? [toolMsgs] : []);
            for (const toolMsg of toolMessagesArray) {
                if (toolMsg?.name) {
                    await logToolResult(runId, article.title, toolMsg.name);
                }
            }
        }
    }

    return { finalContent, toolsUsed, toolCalls };
}

/**
 * Log tool call initiation
 */
async function logToolCall(runId: string, articleTitle: string, toolName: string): Promise<void> {
    if (toolName === 'read_article') {
        await logActivity(runId, 'reading', '📖 Step 2: Reading full article...', articleTitle, toolName);
    } else if (toolName === 'search_web' || toolName === 'search_news') {
        await logActivity(runId, 'searching', '🔍 Step 3: Searching for verification...', articleTitle, toolName);
    } else if (toolName === 'get_guidance' || toolName === 'find_similar') {
        await logActivity(runId, 'thinking', `💡 Consulting memory: ${toolName}`, articleTitle, toolName);
    } else {
        await logActivity(runId, 'tool', `🔧 Using ${toolName}`, articleTitle, toolName);
    }
}

/**
 * Log tool execution result
 */
async function logToolResult(runId: string, articleTitle: string, toolName: string): Promise<void> {
    if (toolName === 'read_article') {
        await logActivity(runId, 'step', '📄 Article content retrieved', articleTitle);
    } else if (toolName === 'search_web' || toolName === 'search_news') {
        await logActivity(runId, 'step', '🔎 Search results received', articleTitle);
    }
}

// ============= SAVE RESULTS =============

/**
 * Save generated posts to database
 */
async function saveResults(
    queueItem: AgentQueueItem,
    article: NewsItem,
    posts: GeneratedPosts,
    toolCalls: ToolCall[]
): Promise<void> {
    await updateQueueItem(queueItem.id!, {
        status: 'completed',
        decision: 'generate',
        reasoning: posts.reasoning,
        x_post: posts.xPost || undefined,
        instagram_caption: posts.instagram || undefined,
        facebook_post: posts.facebook || undefined,
        hashtags: posts.hashtags,
        tool_calls: toolCalls,
    });

    await markNewsItemProcessed(
        article.id!,
        posts.xPost || undefined,
        posts.instagram || undefined,
        posts.facebook || undefined
    );
}

// ============= MAIN PROCESSOR =============

/**
 * Process a single article from the queue
 */
export async function processArticle(
    article: NewsItem,
    queueItem: AgentQueueItem,
    runId: string,
    agent: NewsAgent
): Promise<ProcessResult> {
    const toolCallsArray: ToolCall[] = [];

    try {
        // Step 1: Analyzing
        await logActivity(runId, 'thinking', '🧠 Step 1: Analyzing snippet...', article.title);
        console.log(`[Agent] Processing: ${article.title.slice(0, 50)}...`);

        // Step 2: Stream agent response
        const { finalContent, toolCalls } = await streamAgentResponse(agent, article, runId);
        toolCallsArray.push(...toolCalls);

        // Step 3: Parse response
        await logActivity(runId, 'generating', '✍️ Step 4: Making decision...', article.title);
        const parsed = parseAgentResponse(finalContent);

        let posts: GeneratedPosts;

        if (!parsed) {
            // Parse failed - create fallback
            console.log(`[Agent] Parse error, creating fallback posts for: ${article.title.slice(0, 30)}...`);
            posts = createFallbackPosts(article, toolCallsArray);
        } else if (parsed.decision === 'skip' || !parsed.x_post) {
            // LLM tried to skip - force generation
            console.log(`[Agent] LLM tried to skip, forcing generation for: ${article.title.slice(0, 30)}...`);
            posts = forceGeneration(article, parsed, toolCallsArray);
        } else {
            // Normal generation
            await logActivity(runId, 'generating', `📝 Generating posts for X, Instagram, Facebook...`, article.title);
            posts = extractPosts(parsed, toolCallsArray);
        }

        // Step 4: Save results
        await saveResults(queueItem, article, posts, toolCallsArray);

        return {
            skipped: false,
            generated: true,
            tierUsed: posts.tierUsed,
            toolCalls: toolCallsArray.length,
            reasoning: posts.reasoning,
        };

    } catch (error) {
        await updateQueueItem(queueItem.id!, {
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown',
            tool_calls: toolCallsArray,
        });
        throw error;
    }
}
