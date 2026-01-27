/**
 * Feeder Clear API Route
 * 
 * Endpoint to clear permanent storage (Danger Zone)
 * POST /api/feeder/clear
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    clearAllGuids,
    clearAllHashes,
    clearAllTitles,
    clearAllFingerprints,
    clearAllPermanentData,
    getStorageStats,
} from '@/lib/feeder/permanent-store';
import { deleteAllEmbeddings } from '@/lib/feeder/vector-search';

export async function POST(request: NextRequest) {
    try {
        const { type } = await request.json();

        let result;

        switch (type) {
            case 'guids':
                result = await clearAllGuids();
                return NextResponse.json({
                    success: result.success,
                    message: `Cleared ${result.deleted} GUIDs`,
                    deleted: result.deleted,
                });

            case 'hashes':
                result = await clearAllHashes();
                return NextResponse.json({
                    success: result.success,
                    message: `Cleared ${result.deleted} hashes`,
                    deleted: result.deleted,
                });

            case 'fingerprints':
                result = await clearAllFingerprints();
                return NextResponse.json({
                    success: result.success,
                    message: `Cleared ${result.deleted} fingerprints`,
                    deleted: result.deleted,
                });

            case 'titles':
                result = await clearAllTitles();
                return NextResponse.json({
                    success: result.success,
                    message: `Cleared ${result.deleted} titles`,
                    deleted: result.deleted,
                });

            case 'all':
                result = await clearAllPermanentData();
                // Also clear Pinecone vectors
                await deleteAllEmbeddings();

                return NextResponse.json({
                    success: result.success,
                    message: `Cleared all permanent data: ${result.guids} GUIDs, ${result.hashes} hashes, ${result.titles} titles, ${result.fingerprints} fingerprints + Pinecone Index`,
                    deleted: {
                        guids: result.guids,
                        hashes: result.hashes,
                        titles: result.titles,
                        fingerprints: result.fingerprints
                    },
                });

            default:
                return NextResponse.json(
                    { error: 'Invalid type. Use: guids, hashes, titles, or all' },
                    { status: 400 }
                );
        }
    } catch (error) {
        console.error('[API] Error clearing data:', error);
        return NextResponse.json(
            { error: 'Failed to clear data' },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        const stats = await getStorageStats();
        return NextResponse.json({
            success: true,
            stats,
        });
    } catch (error) {
        console.error('[API] Error getting stats:', error);
        return NextResponse.json(
            { error: 'Failed to get stats' },
            { status: 500 }
        );
    }
}
