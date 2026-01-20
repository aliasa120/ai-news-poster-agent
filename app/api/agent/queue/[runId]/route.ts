import { NextRequest, NextResponse } from 'next/server';
import { getQueueItems } from '@/lib/agent/store';

/**
 * GET: Get queue items for a specific run
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ runId: string }> }
): Promise<NextResponse> {
    try {
        const { runId } = await params;
        const items = await getQueueItems(runId);

        return NextResponse.json({
            success: true,
            items,
        });
    } catch (error) {
        console.error('Agent queue error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
