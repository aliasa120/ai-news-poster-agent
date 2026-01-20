'use client';

import { NewsItem } from '@/lib/types';
import { FeedCard } from './FeedCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Newspaper } from 'lucide-react';

interface FeedListProps {
    items: NewsItem[];
    isLoading: boolean;
}

export function FeedList({ items, isLoading }: FeedListProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                    <Card key={i} className="overflow-hidden bg-card border-border">
                        <Skeleton className="h-40 w-full rounded-none" />
                        <CardContent className="p-4 space-y-3">
                            <div className="flex justify-between">
                                <Skeleton className="h-5 w-20" />
                                <Skeleton className="h-4 w-16" />
                            </div>
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-full" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <Card className="bg-card border-border border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="p-4 rounded-full bg-muted mb-4">
                        <Newspaper className="w-12 h-12 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-card-foreground mb-2">No News Articles Yet</h3>
                    <p className="text-muted-foreground text-sm max-w-md">
                        Click the &quot;Refresh Feed&quot; button to fetch the latest Pakistan news from Google News RSS.
                    </p>
                </CardContent>
            </Card>
        );
    }

    // Count new items
    const newCount = items.filter((item) => item.is_new).length;

    return (
        <div className="space-y-4">
            {/* Stats bar */}
            {newCount > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1 text-primary font-medium">
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        {newCount} new article{newCount > 1 ? 's' : ''} in this view
                    </span>
                </div>
            )}

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {items.map((item) => (
                    <FeedCard key={item.id || item.hash} item={item} />
                ))}
            </div>
        </div>
    );
}
