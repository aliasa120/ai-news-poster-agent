'use client';

import { NewsItem } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ExternalLink, Clock, Building2 } from 'lucide-react';

interface FeedCardProps {
    item: NewsItem;
}

export function FeedCard({ item }: FeedCardProps) {
    const timeAgo = getTimeAgo(item.pub_date);
    const isRecent = item.is_new;

    return (
        <Card className={`group relative overflow-hidden bg-card border-border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${isRecent ? 'ring-2 ring-primary/50' : ''}`}>
            {/* NEW Badge */}
            {isRecent && (
                <div className="absolute top-3 right-3 z-10">
                    <Badge className="bg-primary text-primary-foreground font-semibold animate-pulse">
                        <Sparkles className="w-3 h-3 mr-1" />
                        NEW
                    </Badge>
                </div>
            )}

            {/* Image */}
            <div className="relative h-40 overflow-hidden bg-muted">
                {item.image_url ? (
                    <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder-news.svg';
                        }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-gradient-to-br from-muted to-secondary">
                        <Building2 className="w-12 h-12 opacity-40" />
                    </div>
                )}
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            </div>

            <CardContent className="p-4 space-y-3">
                {/* Source & Time */}
                <div className="flex items-center justify-between gap-2">
                    {item.source_name && (
                        <Badge variant="secondary" className="text-xs font-medium truncate max-w-[60%]">
                            {item.source_name}
                        </Badge>
                    )}
                    <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3" />
                        {timeAgo}
                    </span>
                </div>

                {/* Title */}
                <h3 className="font-semibold text-sm leading-tight line-clamp-2 text-card-foreground min-h-[2.5rem]">
                    <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary transition-colors inline-flex items-start gap-1 group/link"
                    >
                        {item.title}
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity shrink-0 mt-1" />
                    </a>
                </h3>

                {/* Snippet */}
                {item.content_snippet && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {item.content_snippet}
                    </p>
                )}

                {/* Status */}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                    {item.is_posted ? (
                        <Badge variant="outline" className="text-success border-success/50 text-xs">
                            ✓ Posted
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="text-warning border-warning/50 text-xs">
                            Pending
                        </Badge>
                    )}

                    {item.posted_platforms && item.posted_platforms.length > 0 && (
                        <div className="flex gap-1">
                            {item.posted_platforms.map((p) => (
                                <span key={p} className="text-sm">
                                    {p === 'x' ? '𝕏' : p === 'instagram' ? '📷' : '📘'}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function getTimeAgo(dateString: string | null): string {
    if (!dateString) return 'Unknown';

    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
}
