import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET: Get all generated posts with article details
 */
export async function GET(): Promise<NextResponse> {
    try {
        // Get queue items with generated posts, join with news_items
        const { data, error } = await supabase
            .from('agent_queue')
            .select(`
        *,
        news_items (
          id,
          title,
          link,
          source_name,
          image_url,
          pub_date
        )
      `)
            .eq('status', 'completed')
            .eq('decision', 'generate')
            .order('processed_at', { ascending: false })
            .limit(500);

        if (error) {
            console.error('Error fetching generated posts:', error)
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        // Count total
        const { count } = await supabase
            .from('agent_queue')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'completed')
            .eq('decision', 'generate');

        return NextResponse.json({
            success: true,
            posts: data || [],
            totalCount: count || 0,
        });
    } catch (error) {
        console.error('Posts API error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

/**
 * DELETE: Delete all generated posts
 */
export async function DELETE(): Promise<NextResponse> {
    try {
        // 1. Get news_item_ids from queue items to reset their is_posted status
        const { data: queueItems } = await supabase
            .from('agent_queue')
            .select('news_item_id')
            .eq('decision', 'generate');

        const newsItemIds = queueItems?.map(q => q.news_item_id).filter(Boolean) || [];

        // 2. Reset news_items is_posted status
        if (newsItemIds.length > 0) {
            await supabase
                .from('news_items')
                .update({
                    is_posted: false,
                    x_post: null,
                    instagram_caption: null,
                    facebook_post: null,
                })
                .in('id', newsItemIds);
        }

        // 3. Delete all queue items
        const { error } = await supabase
            .from('agent_queue')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');

        if (error) {
            console.error('Error deleting posts:', error);
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            deletedCount: newsItemIds.length,
        });
    } catch (error) {
        console.error('Delete posts error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
