import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getFeederSettings } from '@/lib/feed-store';
import { SettingsResponse } from '@/lib/types';
import { FeederSettingsSchema, DEFAULT_FEEDER_SETTINGS, FeederSettings } from '@/lib/feeder/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * GET: Retrieve current feeder settings (both legacy and new)
 */
export async function GET(): Promise<NextResponse<SettingsResponse & { feederSettings?: FeederSettings }>> {
    try {
        // Get legacy settings
        const settings = await getFeederSettings();

        // Get new feeder agent settings
        let feederSettings = DEFAULT_FEEDER_SETTINGS;
        try {
            const { data, error } = await supabase
                .from('feeder_settings')
                .select('*')
                .eq('id', 1)
                .single();

            if (data && !error) {
                feederSettings = FeederSettingsSchema.parse({
                    ai_provider: data.ai_provider,
                    ai_model: data.ai_model,
                    enable_source_filter: data.enable_source_filter,
                    include_official_sources: data.include_official_sources,
                    include_secondary_sources: data.include_secondary_sources,
                    max_check_titles: data.max_check_titles,
                    enable_ai_verification: data.enable_ai_verification,
                    freshness_hours: data.freshness_hours,
                });
            }
        } catch {
            // Use defaults if feeder_settings table doesn't exist
        }

        // Merge legacy and new settings for the UI
        const mergedSettings = settings ? {
            ...settings,
            ai_provider: feederSettings.ai_provider,
            ai_model: feederSettings.ai_model,
            enable_ai_verification: feederSettings.enable_ai_verification,
            max_check_titles: feederSettings.max_check_titles,
            batch_size: feederSettings.batch_size,
            include_official_sources: feederSettings.include_official_sources,
            include_secondary_sources: feederSettings.include_secondary_sources,
            enable_source_filter: feederSettings.enable_source_filter,
        } : null;

        return NextResponse.json({
            success: true,
            settings: mergedSettings,
            feederSettings,
        });
    } catch (error) {
        console.error('Get settings error:', error);
        return NextResponse.json(
            {
                success: false,
                settings: null,
                feederSettings: DEFAULT_FEEDER_SETTINGS,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

/**
 * PUT: Update feeder agent settings
 */
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate input
        const validatedSettings = FeederSettingsSchema.partial().parse(body);

        // Update settings
        const { data, error } = await supabase
            .from('feeder_settings')
            .update({
                ...validatedSettings,
                updated_at: new Date().toISOString(),
            })
            .eq('id', 1)
            .select()
            .single();

        if (error) {
            console.error('[API] Error updating feeder settings:', error);
            return NextResponse.json(
                { error: 'Failed to update settings' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            settings: data,
        });
    } catch (error) {
        console.error('[API] Error in PUT /api/feeder/settings:', error);
        return NextResponse.json(
            { error: 'Invalid settings data' },
            { status: 400 }
        );
    }
}
