import { NextResponse } from 'next/server';
import { getActiveRun, getLatestActivity, getAgentSettings } from '@/lib/agent/store';

export async function GET() {
    try {
        const [activeRun, activity, settings] = await Promise.all([
            getActiveRun(),
            getLatestActivity(30),
            getAgentSettings(),
        ]);

        return NextResponse.json({
            success: true,
            run: activeRun,
            activity: activity,
            settings: settings,
        });
    } catch (error) {
        console.error('Error fetching monitor data:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch monitor data' },
            { status: 500 }
        );
    }
}
