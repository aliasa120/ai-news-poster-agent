/**
 * Agent State Management
 * 
 * Manages global agent state including abort controller and run ID.
 */

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
