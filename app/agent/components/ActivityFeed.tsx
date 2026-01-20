'use client';

import { Activity, Brain, FileText, Search, Wrench, PenTool, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Activity log from database
export interface ActivityLog {
    id: string;
    run_id: string;
    type: 'info' | 'tool' | 'decision' | 'error' | 'success' | 'thinking' | 'step' | 'reading' | 'searching' | 'generating';
    message: string;
    article_title?: string;
    tool_name?: string;
    created_at: string;
}

interface ActivityFeedProps {
    activity: ActivityLog[];
    isRunning: boolean;
}

// Activity icon based on type
function getActivityIcon(type: string) {
    switch (type) {
        case 'thinking': return <Brain className="w-3 h-3 text-violet-400 animate-pulse" />;
        case 'step': return <Activity className="w-3 h-3 text-blue-400" />;
        case 'reading': return <FileText className="w-3 h-3 text-blue-400" />;
        case 'searching': return <Search className="w-3 h-3 text-orange-400" />;
        case 'generating': return <PenTool className="w-3 h-3 text-green-400" />;
        case 'tool': return <Wrench className="w-3 h-3 text-yellow-400" />;
        case 'success': return <CheckCircle2 className="w-3 h-3 text-green-500" />;
        case 'error': return <AlertCircle className="w-3 h-3 text-red-500" />;
        case 'decision': return <Brain className="w-3 h-3 text-purple-500" />;
        default: return <Activity className="w-3 h-3" />;
    }
}

function formatTime(d: string) {
    return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function ActivityFeed({ activity, isRunning }: ActivityFeedProps) {
    return (
        <Card className="h-full">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                    <Activity className="w-4 h-4" />
                    Activity Feed
                    {isRunning && (
                        <span className="ml-auto relative flex h-2 w-2">
                            <span className="animate-ping absolute h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-1 max-h-[400px] overflow-y-auto">
                    {activity.length === 0 ? (
                        <div className="text-sm text-muted-foreground text-center py-8">
                            No activity yet
                        </div>
                    ) : (
                        activity.slice(0, 50).map((log) => (
                            <div key={log.id} className="flex items-start gap-2 py-1.5 text-xs border-b border-border/50 last:border-0">
                                <div className="shrink-0 mt-0.5">
                                    {getActivityIcon(log.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className={`${log.type === 'error' ? 'text-red-400' :
                                            log.type === 'success' ? 'text-green-400' :
                                                'text-foreground'
                                        }`}>
                                        {log.message}
                                    </span>
                                </div>
                                <span className="text-muted-foreground shrink-0 text-[10px]">
                                    {formatTime(log.created_at)}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
