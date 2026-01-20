'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Newspaper, ChevronRight } from 'lucide-react';

interface QueueItem {
    id?: string;
    title: string;
    source_name: string | null;
    pub_date?: string | null;
}

interface QueuePreviewProps {
    items: QueueItem[];
    showPreview: boolean;
    onTogglePreview: () => void;
}

export function QueuePreview({ items, showPreview, onTogglePreview }: QueuePreviewProps) {
    return (
        <Card>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm">
                        <Newspaper className="w-4 h-4 text-blue-500" />
                        Queue Preview
                        {items.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                                {items.length}
                            </Badge>
                        )}
                    </CardTitle>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onTogglePreview}
                        className="h-8 gap-1"
                    >
                        {showPreview ? (
                            <>
                                <EyeOff className="w-3 h-3" />
                                Hide
                            </>
                        ) : (
                            <>
                                <Eye className="w-3 h-3" />
                                Show
                            </>
                        )}
                    </Button>
                </div>
            </CardHeader>
            {showPreview && (
                <CardContent className="pt-0">
                    {items.length === 0 ? (
                        <div className="text-sm text-muted-foreground text-center py-4">
                            No articles in queue
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {items.map((item, idx) => (
                                <div
                                    key={item.id || idx}
                                    className="flex items-start gap-2 p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium line-clamp-2">{item.title}</p>
                                        {item.source_name && (
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {item.source_name}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    );
}
