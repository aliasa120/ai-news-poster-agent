'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AgentSettings, AgentRun } from '@/lib/agent/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';
import { Switch } from '@/components/ui/switch';
import {
    Bot,
    Play,
    Square,
    Settings,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Activity,
    Search,
    FileText,
    Brain,
    Zap,
    Newspaper,
    PenTool,
    Circle,
    CircleDot,
    CircleCheck,
    CircleX,
    Wrench,
    Timer,
    Eye,
    EyeOff,
    Clock,
    ChevronRight,
    TrendingUp,
    Trash2,
} from 'lucide-react';
import Link from 'next/link';

// Activity log types
interface ActivityLog {
    id: string;
    run_id: string;
    type: 'info' | 'tool' | 'decision' | 'error' | 'success' | 'thinking' | 'step' | 'reading' | 'searching' | 'generating';
    message: string;
    article_title?: string;
    tool_name?: string;
    created_at: string;
}

interface ProcessingStep {
    id: string;
    type: 'analyze' | 'tool' | 'generate' | 'complete' | 'skip' | 'error' | 'thinking' | 'reading' | 'searching';
    status: 'pending' | 'active' | 'done' | 'error';
    label: string;
    timestamp: Date;
}

interface ArticleState {
    title: string;
    index: number;
    total: number;
    status: 'processing' | 'done' | 'skipped' | 'error';
    steps: ProcessingStep[];
}

export default function AgentPage() {
    const [settings, setSettings] = useState<AgentSettings | null>(null);
    const [runs, setRuns] = useState<AgentRun[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activity, setActivity] = useState<ActivityLog[]>([]);
    const [currentArticle, setCurrentArticle] = useState<ArticleState | null>(null);
    const [processedCount, setProcessedCount] = useState(0);
    const [generatedCount, setGeneratedCount] = useState(0);
    const [totalArticles, setTotalArticles] = useState(0);
    const [activeRunId, setActiveRunId] = useState<string | null>(null);
    const [autoRunEnabled, setAutoRunEnabled] = useState(false);
    const [autoRunInterval, setAutoRunInterval] = useState(60);
    const [countdownSeconds, setCountdownSeconds] = useState(0);
    const [upcomingArticles, setUpcomingArticles] = useState<{ id?: string; title: string; source_name: string | null }[]>([]);
    const [showPreview, setShowPreview] = useState(true);

    const lastActivityIdRef = useRef<string | null>(null);
    const autoRunTimerRef = useRef<NodeJS.Timeout | null>(null);
    const countdownRef = useRef<NodeJS.Timeout | null>(null);
    const startAgentRef = useRef<() => void>(() => { });

    // Fetch status
    const fetchStatus = useCallback(async () => {
        try {
            const res = await fetch('/api/agent');
            const data = await res.json();
            if (data.success) {
                setSettings(data.settings);
                setRuns(data.runs || []);
                const wasRunning = isRunning;
                setIsRunning(data.isRunning);

                if (!data.isRunning && wasRunning) {
                    setIsCancelling(false);
                    setTimeout(() => setCurrentArticle(null), 2000);
                }

                if (data.activeRun) {
                    setActiveRunId(data.activeRun.id);
                    setProcessedCount(data.activeRun.articles_processed || 0);
                    setGeneratedCount(data.activeRun.posts_generated || 0);
                } else {
                    setActiveRunId(null);
                    if (data.runs && data.runs.length > 0) {
                        const lastRun = data.runs[0];
                        setProcessedCount(lastRun.articles_processed || 0);
                        setGeneratedCount(lastRun.posts_generated || 0);
                    }
                }

                if (data.activity && data.activity.length > 0) {
                    setActivity(data.activity);
                    processActivityLogs(data.activity);
                }
            }
        } catch (err) {
            console.error('Failed to fetch status:', err);
        }
    }, [isRunning]);

    const processActivityLogs = useCallback((logs: ActivityLog[]) => {
        if (logs.length === 0) return;
        const latestLog = logs[0];
        if (lastActivityIdRef.current === latestLog.id) return;
        lastActivityIdRef.current = latestLog.id;

        const match = latestLog.message.match(/(\d+)\/(\d+)/);
        if (latestLog.article_title) {
            const articleIndex = match ? parseInt(match[1]) : 1;
            const articleTotal = match ? parseInt(match[2]) : totalArticles || 1;
            setTotalArticles(articleTotal);

            setCurrentArticle(prev => {
                const articleTitle = latestLog.article_title || '';
                if (prev?.title === articleTitle) {
                    const newStep: ProcessingStep = {
                        id: latestLog.id,
                        type: mapLogTypeToStepType(latestLog.type),
                        status: 'active',
                        label: latestLog.message.replace(/^\d+\/\d+:\s*/, ''),
                        timestamp: new Date(latestLog.created_at),
                    };
                    const updatedSteps = prev?.steps?.map(s => ({ ...s, status: 'done' as const })) || [];
                    return { ...prev!, steps: [...updatedSteps, newStep], status: 'processing' as const };
                }
                return {
                    title: articleTitle,
                    index: articleIndex,
                    total: articleTotal,
                    status: 'processing' as const,
                    steps: [{
                        id: latestLog.id,
                        type: mapLogTypeToStepType(latestLog.type),
                        status: 'active' as const,
                        label: latestLog.message.replace(/^\d+\/\d+:\s*/, ''),
                        timestamp: new Date(latestLog.created_at),
                    }],
                };
            });

            if (latestLog.type === 'success') {
                setCurrentArticle(prev => prev ? { ...prev, status: 'done' } : null);
            }
        }
    }, [totalArticles]);

    const mapLogTypeToStepType = (type: string) => {
        const map: Record<string, ProcessingStep['type']> = {
            thinking: 'thinking', reading: 'reading', searching: 'searching',
            tool: 'tool', generating: 'generate', success: 'complete', error: 'error',
        };
        return map[type] || 'analyze';
    };

    useEffect(() => { fetchStatus(); }, []);
    useEffect(() => {
        const interval = setInterval(fetchStatus, isRunning ? 1000 : 5000);
        return () => clearInterval(interval);
    }, [fetchStatus, isRunning]);

    // Preview fetch
    const fetchPreview = useCallback(async () => {
        try {
            const res = await fetch('/api/agent?preview=true');
            const data = await res.json();
            if (data.success) {
                if (data.pendingQueueItems?.length > 0) {
                    setUpcomingArticles(data.pendingQueueItems);
                } else if (data.upcomingArticles) {
                    setUpcomingArticles(data.upcomingArticles);
                }
            }
        } catch { }
    }, []);

    useEffect(() => {
        if (showPreview) {
            fetchPreview();
            const i = setInterval(fetchPreview, 10000);
            return () => clearInterval(i);
        }
    }, [showPreview, fetchPreview]);

    // Auto-run
    useEffect(() => { startAgentRef.current = startAgent; }, []);
    useEffect(() => {
        if (autoRunEnabled && !isRunning) {
            setCountdownSeconds(autoRunInterval * 60);
            countdownRef.current = setInterval(() => {
                setCountdownSeconds(prev => {
                    if (prev <= 1) { startAgentRef.current(); return autoRunInterval * 60; }
                    return prev - 1;
                });
            }, 1000);
            return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
        } else {
            if (countdownRef.current) clearInterval(countdownRef.current);
            setCountdownSeconds(0);
        }
    }, [autoRunEnabled, isRunning, autoRunInterval]);

    const startAgent = async () => {
        setIsStarting(true);
        setError(null);
        try {
            await fetch('/api/agent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'start' }) });
        } catch { setError('Failed to start'); }
        finally { setIsStarting(false); }
    };

    const stopAgent = async () => {
        setIsCancelling(true);
        try {
            await fetch('/api/agent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'cancel' }) });
        } catch { }
    };

    const formatTime = (d: string) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formatCountdown = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'thinking': return <Brain className="w-3.5 h-3.5 text-violet-400" />;
            case 'reading': return <FileText className="w-3.5 h-3.5 text-blue-400" />;
            case 'searching': return <Search className="w-3.5 h-3.5 text-orange-400" />;
            case 'generating': return <PenTool className="w-3.5 h-3.5 text-green-400" />;
            case 'tool': return <Wrench className="w-3.5 h-3.5 text-yellow-400" />;
            case 'success': return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />;
            case 'error': return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
            default: return <Activity className="w-3.5 h-3.5 text-muted-foreground" />;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-violet-950/10">

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                {error && (
                    <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-500 text-sm">
                        <AlertCircle className="w-4 h-4" />{error}
                        <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-auto">×</Button>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column - Controls */}
                    <div className="lg:col-span-3 space-y-4">
                        {/* Main Control Card */}
                        <Card className="bg-card/50 backdrop-blur border-border/50 overflow-hidden">
                            <div className={`h-1 ${isRunning ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-violet-500 to-purple-500'}`} />
                            <CardContent className="pt-6 space-y-4">
                                {isRunning ? (
                                    <Button variant="destructive" className="w-full h-12 text-base" onClick={stopAgent} disabled={isCancelling}>
                                        {isCancelling ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Square className="w-5 h-5 mr-2" />}
                                        {isCancelling ? 'Stopping...' : 'Stop Agent'}
                                    </Button>
                                ) : (
                                    <Button className="w-full h-12 text-base bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-lg shadow-violet-500/25" onClick={startAgent} disabled={isStarting}>
                                        {isStarting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Play className="w-5 h-5 mr-2" />}
                                        {isStarting ? 'Starting...' : 'Start Agent'}
                                    </Button>
                                )}

                                {/* Stats */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 rounded-lg bg-secondary/50 text-center">
                                        <div className="text-2xl font-bold text-foreground">{processedCount}</div>
                                        <div className="text-xs text-muted-foreground">Processed</div>
                                    </div>
                                    <div className="p-3 rounded-lg bg-green-500/10 text-center">
                                        <div className="text-2xl font-bold text-green-500">{generatedCount}</div>
                                        <div className="text-xs text-green-600/70">Generated</div>
                                    </div>
                                </div>

                                {/* Progress */}
                                {isRunning && totalArticles > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>Progress</span>
                                            <span>{Math.round((processedCount / totalArticles) * 100)}%</span>
                                        </div>
                                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all" style={{ width: `${(processedCount / totalArticles) * 100}%` }} />
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Auto-Run */}
                        <Card className="bg-card/50 backdrop-blur border-border/50">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <Timer className="w-4 h-4 text-orange-500" />Auto-Run
                                    </CardTitle>
                                    <Switch checked={autoRunEnabled} onCheckedChange={setAutoRunEnabled} disabled={isRunning} />
                                </div>
                            </CardHeader>
                            {autoRunEnabled && !isRunning && (
                                <CardContent className="pt-0">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Next run in</span>
                                        <span className="font-mono text-lg font-bold text-foreground">{formatCountdown(countdownSeconds)}</span>
                                    </div>
                                </CardContent>
                            )}
                        </Card>

                        {/* Queue Preview */}
                        <Card className="bg-card/50 backdrop-blur border-border/50">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <Newspaper className="w-4 h-4 text-blue-500" />Queue
                                        {upcomingArticles.length > 0 && <Badge variant="secondary" className="text-xs">{upcomingArticles.length}</Badge>}
                                    </CardTitle>
                                    <div className="flex items-center gap-1">
                                        {upcomingArticles.length > 0 && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                                onClick={async () => {
                                                    try {
                                                        await fetch('/api/agent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'clear_queue' }) });
                                                        setUpcomingArticles([]);
                                                        fetchPreview();
                                                    } catch { }
                                                }}
                                                disabled={isRunning}
                                                title="Clear pending queue items"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        )}
                                        <Button variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)} className="h-7 px-2">
                                            {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            {showPreview && (
                                <CardContent className="pt-0 max-h-64 overflow-y-auto">
                                    {upcomingArticles.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center py-4">No articles in queue</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {upcomingArticles.slice(0, 5).map((a, i) => (
                                                <div key={a.id || i} className="flex items-start gap-2 p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                                                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-medium line-clamp-2">{a.title !== 'Unknown' ? a.title : '(Orphaned item)'}</p>
                                                        {a.source_name && <p className="text-[10px] text-muted-foreground">{a.source_name}</p>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            )}
                        </Card>
                    </div>

                    {/* Center - Live Processing */}
                    <div className="lg:col-span-5">
                        <Card className="bg-card/50 backdrop-blur border-border/50 h-full min-h-[500px]">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2">
                                        <Activity className="w-5 h-5" />Live Processing
                                    </CardTitle>
                                    {isRunning && (
                                        <Badge className="bg-green-500/20 text-green-400 border-0 gap-1">
                                            <span className="relative flex h-2 w-2"><span className="animate-ping absolute h-full w-full rounded-full bg-green-400 opacity-75" /><span className="relative rounded-full h-2 w-2 bg-green-500" /></span>
                                            Live
                                        </Badge>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                {currentArticle ? (
                                    <div className="space-y-4">
                                        <div className="p-4 rounded-xl bg-gradient-to-br from-violet-500/10 to-purple-500/5 border border-violet-500/20">
                                            <div className="flex items-start gap-3">
                                                <div className="p-2 rounded-lg bg-violet-500/20 shrink-0">
                                                    <Newspaper className="w-5 h-5 text-violet-400" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                        <Badge variant="outline" className="text-xs">{currentArticle.index}/{currentArticle.total}</Badge>
                                                        <Badge className={`border-0 text-xs ${currentArticle.status === 'processing' ? 'bg-blue-500/20 text-blue-400' : currentArticle.status === 'done' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                            {currentArticle.status === 'processing' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                                                            {currentArticle.status}
                                                        </Badge>
                                                    </div>
                                                    <h3 className="font-medium text-sm line-clamp-2">{currentArticle.title}</h3>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2 max-h-64 overflow-y-auto">
                                            {currentArticle.steps.map(step => (
                                                <div key={step.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/30">
                                                    {step.status === 'active' ? <CircleDot className="w-4 h-4 text-blue-500 animate-pulse" /> : step.status === 'done' ? <CircleCheck className="w-4 h-4 text-green-500" /> : <Circle className="w-4 h-4 text-muted-foreground" />}
                                                    <span className={`text-sm flex-1 ${step.status === 'active' ? 'text-blue-400 font-medium' : 'text-foreground'}`}>{step.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-80 text-center">
                                        <div className="p-4 rounded-2xl bg-secondary/50 mb-4"><Newspaper className="w-10 h-10 text-muted-foreground" /></div>
                                        <h3 className="font-semibold text-lg">Ready to Process</h3>
                                        <p className="text-sm text-muted-foreground mt-1">Click Start Agent to begin</p>
                                    </div>
                                )}

                                {/* Activity Feed */}
                                {activity.length > 0 && (
                                    <div className="mt-6 pt-4 border-t border-border/50">
                                        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                                            <Activity className="w-4 h-4" />Recent Activity
                                        </h4>
                                        <div className="space-y-1 max-h-48 overflow-y-auto">
                                            {activity.slice(0, 15).map(log => (
                                                <div key={log.id} className="flex items-start gap-2 py-1.5 text-xs">
                                                    {getActivityIcon(log.type)}
                                                    <span className={`flex-1 ${log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-green-400' : 'text-muted-foreground'}`}>{log.message}</span>
                                                    <span className="text-muted-foreground/60 text-[10px]">{formatTime(log.created_at)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right - Run History */}
                    <div className="lg:col-span-4">
                        <Card className="bg-card/50 backdrop-blur border-border/50 h-full">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-sm">
                                    <Clock className="w-4 h-4" />Run History
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {runs.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-8">No runs yet</p>
                                ) : (
                                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                                        {runs.slice(0, 10).map(run => (
                                            <div key={run.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                                                <div className="shrink-0">
                                                    {run.status === 'running' ? (
                                                        <div className="p-2 rounded-full bg-blue-500/20"><Loader2 className="w-4 h-4 text-blue-500 animate-spin" /></div>
                                                    ) : run.status === 'completed' ? (
                                                        <div className="p-2 rounded-full bg-green-500/20"><CheckCircle2 className="w-4 h-4 text-green-500" /></div>
                                                    ) : run.status === 'cancelled' ? (
                                                        <div className="p-2 rounded-full bg-orange-500/20"><Square className="w-4 h-4 text-orange-500" /></div>
                                                    ) : (
                                                        <div className="p-2 rounded-full bg-red-500/20"><AlertCircle className="w-4 h-4 text-red-500" /></div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-mono text-sm">{formatTime(run.created_at || new Date().toISOString())}</span>
                                                        <Badge variant={run.status === 'completed' ? 'default' : run.status === 'running' ? 'secondary' : 'destructive'} className="text-[10px]">
                                                            {run.status}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-4 mt-1 text-xs">
                                                        <span className="text-muted-foreground">{run.articles_processed} processed</span>
                                                        <span className="text-green-500">{run.posts_generated} generated</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
