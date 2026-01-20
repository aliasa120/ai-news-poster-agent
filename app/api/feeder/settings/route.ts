import { NextResponse } from 'next/server';
import { getFeederSettings } from '@/lib/feed-store';
import { SettingsResponse } from '@/lib/types';

/**
 * GET: Retrieve current feeder settings
 */
export async function GET(): Promise<NextResponse<SettingsResponse>> {
    try {
        const settings = await getFeederSettings();
        return NextResponse.json({
            success: true,
            settings,
        });
    } catch (error) {
        console.error('Get settings error:', error);
        return NextResponse.json(
            {
                success: false,
                settings: null,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
