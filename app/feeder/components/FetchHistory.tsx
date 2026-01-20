'use client';

import { useState, useEffect } from 'react';
import { FetchLog } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { History, TrendingUp, XCircle, CheckCircle2 } from 'lucide-react';

interface FetchHistoryProps {
    refreshTrigger?: number;
}

export function FetchHistory({ refreshTrigger }: FetchHistoryProps) {
    const [logs, setLogs] = useState<FetchLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, [refreshTrigger]);

    const fetchLogs = async () => {
        try {
            const res = await fetch('/api/feeder?logs=true');
            const data = await res.json();
            if (data.success) {
                setLogs(data.logs);
            }
        } catch (err) {
            console.error('Failed to fetch logs:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    if (isLoading) {
        return (
            <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <History className="w-4 h-4" />
                        Fetch History
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="animate-pulse space-y-2">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-12 bg-muted rounded" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (logs.length === 0) {
        return (
            <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <History className="w-4 h-4" />
                        Fetch History
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground text-center py-4">
                        No fetch history yet. Click &quot;Refresh Feed&quot; to start.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-card border-border">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Fetch History
                    <Badge variant="secondary" className="ml-auto text-xs">
                        {logs.length} records
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {logs.map((log, index) => (
                        <div
                            key={log.id || index}
                            className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="text-xs text-muted-foreground w-16">
                                    <div className="font-medium text-foreground">{formatTime(log.fetched_at)}</div>
                                    <div>{formatDate(log.fetched_at)}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {log.new_items > 0 ? (
                                        <Badge className="bg-success/20 text-success border-0">
                                            <TrendingUp className="w-3 h-3 mr-1" />
                                            +{log.new_items} new
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-muted-foreground border-muted">
                                            <CheckCircle2 className="w-3 h-3 mr-1" />
                                            No new
                                        </Badge>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{log.total_fetched} fetched</span>
                                {log.duplicates_skipped > 0 && (
                                    <Badge variant="outline" className="text-xs">
                                        <XCircle className="w-3 h-3 mr-1" />
                                        {log.duplicates_skipped} skipped
                                    </Badge>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
