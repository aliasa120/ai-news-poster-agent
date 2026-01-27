'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import {
    Brain,
    Search,
    BookOpen,
    Loader2,
    CheckCircle2,
    XCircle,
    Play,
    Square,
    Terminal,
    ChevronRight,
    Activity,
    Cpu,
    Zap,
    Globe,
    FileText,
    Minimize2,
    Maximize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// --- Types ---

interface ActivityLog {
    id: string;
    run_id: string;
    type: 'info' | 'tool' | 'decision' | 'error' | 'success' | 'thinking' | 'step' | 'reading' | 'searching' | 'generating';
    message: string;
    article_title?: string;
    tool_name?: string;
    metadata?: Record<string, any>;
    created_at: string;
}

interface AgentRun {
    id: string;
    status: 'running' | 'completed' | 'failed' | 'cancelled';
    articles_processed: number;
    articles_skipped: number;
    posts_generated: number;
}

interface MonitorData {
    run: AgentRun | null;
    activity: ActivityLog[];
}

// --- Main Page Component ---

export default function AgentMonitorPage() {
    const [data, setData] = useState<MonitorData | null>(null);
    const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
    const [autoScroll, setAutoScroll] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Poll for data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('/api/agent/monitor');
                const json = await res.json();
                if (json.success) setData(json);
            } catch (e) {
                console.error(e);
            }
        };
        fetchData();
        const interval = setInterval(fetchData, 1000); // Faster 1s poll for "realtime" feel
        return () => clearInterval(interval);
    }, []);

    // Auto-scroll
    useEffect(() => {
        if (autoScroll && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [data?.activity, autoScroll]);

    const isRunning = data?.run?.status === 'running';

    return (
        <div className="dark min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-indigo-500/30">
            {/* Background Grid Effect */}
            <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

            <div className="relative flex flex-col h-screen max-w-[1600px] mx-auto p-4 gap-4">

                {/* Header Section */}
                <header className="flex items-center justify-between px-6 py-4 bg-neutral-900/50 backdrop-blur-xl border border-neutral-800 rounded-xl shadow-2xl">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className={cn("absolute inset-0 bg-indigo-500 blur-lg opacity-50 rounded-full", isRunning && "animate-pulse")} />
                            <div className="relative bg-neutral-950 p-2 rounded-lg border border-neutral-800">
                                <Terminal className="w-6 h-6 text-indigo-400" />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-400">
                                AGENT COMMAND CENTER
                            </h1>
                            <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono mt-1">
                                <Activity className="w-3 h-3" />
                                STATUS: {data?.run?.status?.toUpperCase() || 'OFFLINE'}
                                {isRunning && <span className="flex h-2 w-2 rounded-full bg-green-500 animate-ping ml-2" />}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {data?.run && (
                            <div className="flex gap-2">
                                <StatBadge icon={<Globe className="w-3 h-3 text-cyan-400" />} label="Processed" value={data.run.articles_processed} />
                                <StatBadge icon={<Zap className="w-3 h-3 text-amber-400" />} label="Generated" value={data.run.posts_generated} />
                            </div>
                        )}
                        <div className="h-8 w-[1px] bg-neutral-800 mx-2" />
                        {isRunning ? (
                            <Button
                                variant="destructive"
                                size="sm"
                                className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                                onClick={() => fetch('/api/agent/stop', { method: 'POST' })}
                            >
                                <Square className="w-4 h-4 mr-2 fill-current" /> ABORT RUN
                            </Button>
                        ) : (
                            <Button
                                size="sm"
                                className="bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/50 shadow-[0_0_15px_rgba(99,102,241,0.4)]"
                                onClick={() => fetch('/api/agent/start', { method: 'POST' })}
                            >
                                <Play className="w-4 h-4 mr-2 fill-current" /> INITIALIZE AGENT
                            </Button>
                        )}
                    </div>
                </header>

                {/* Main Content Area */}
                <div className="flex-1 flex gap-4 min-h-0">

                    {/* Log Console */}
                    <div className="flex-1 flex flex-col bg-neutral-900/40 backdrop-blur-md border border-neutral-800 rounded-xl overflow-hidden shadow-xl">
                        {/* Console Header */}
                        <div className="px-4 py-2 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/80">
                            <div className="flex items-center gap-2 text-xs font-mono text-neutral-500">
                                <span className="text-green-500">➜</span>
                                <span>~/agent/logs</span>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setAutoScroll(!autoScroll)}
                                className={cn(
                                    "h-6 text-[10px] font-mono border",
                                    autoScroll
                                        ? "border-green-500/30 text-green-400 bg-green-500/10"
                                        : "border-neutral-700 text-neutral-500"
                                )}
                            >
                                {autoScroll ? 'AUTO-SCROLL: ON' : 'PAUSED'}
                            </Button>
                        </div>

                        {/* Logs Stream */}
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto p-4 space-y-1 font-mono text-sm"
                        >
                            {data?.activity.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-neutral-600 gap-2">
                                    <Cpu className="w-12 h-12 opacity-20" />
                                    <span>System Ready. Awaiting Input...</span>
                                </div>
                            ) : (
                                [...(data?.activity || [])].reverse().map((log) => (
                                    <LogEntry
                                        key={log.id}
                                        log={log}
                                        isSelected={selectedLog?.id === log.id}
                                        onClick={() => setSelectedLog(log)}
                                    />
                                ))
                            )}

                            {isRunning && (
                                <div className="py-2 animate-pulse flex items-center gap-2 text-indigo-400/50">
                                    <span className="w-2 h-4 bg-indigo-500/50 block" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Inspector Panel (Slide-in) */}
                    <div className={cn(
                        "w-[500px] flex flex-col bg-neutral-900/60 backdrop-blur-xl border border-neutral-800 rounded-xl transition-all duration-300 shadow-2xl overflow-hidden",
                        selectedLog ? "translate-x-0 opacity-100" : "translate-x-10 opacity-50 w-0 border-0 p-0"
                    )}>
                        {selectedLog && (
                            <>
                                <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/80">
                                    <div className="flex items-center gap-2 font-mono text-xs text-neutral-400">
                                        <FileText className="w-4 h-4" />
                                        INSPECTOR
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-neutral-500 hover:text-white"
                                        onClick={() => setSelectedLog(null)}
                                    >
                                        <Minimize2 className="w-4 h-4" />
                                    </Button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-neutral-700">
                                    <div className="mb-6">
                                        <h3 className="text-lg font-bold text-white mb-1">{selectedLog.type.toUpperCase()}</h3>
                                        <p className="text-neutral-400 text-sm">{selectedLog.message}</p>
                                        <div className="flex gap-2 mt-3">
                                            <Badge variant="outline" className="bg-neutral-800/50 border-neutral-700 text-neutral-400 font-mono text-[10px]">
                                                {new Date(selectedLog.created_at).toLocaleTimeString()}
                                            </Badge>
                                            {selectedLog.tool_name && (
                                                <Badge variant="outline" className="bg-indigo-500/10 border-indigo-500/30 text-indigo-400 font-mono text-[10px]">
                                                    {selectedLog.tool_name}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    {/* Dynamic Content Rendering */}
                                    <div className="space-y-4">

                                        {/* Search Results View */}
                                        {selectedLog.type === 'searching' && selectedLog.metadata?.results && (
                                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                                <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-lg">
                                                    <div className="text-xs text-amber-500 mb-1 font-mono uppercase">Query</div>
                                                    <div className="text-lg font-medium text-amber-100">"{selectedLog.metadata.query}"</div>
                                                </div>

                                                <div className="space-y-3">
                                                    {selectedLog.metadata.results.map((res: any, i: number) => (
                                                        <a
                                                            key={i}
                                                            href={res.link}
                                                            target="_blank"
                                                            className="block group bg-neutral-800/30 hover:bg-neutral-800/50 border border-neutral-800 p-3 rounded-lg transition-colors"
                                                        >
                                                            <div className="text-indigo-400 text-sm font-medium group-hover:underline mb-1 flex items-center gap-2">
                                                                {res.title}
                                                                <Maximize2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            </div>
                                                            <div className="text-neutral-500 text-xs line-clamp-2">{res.snippet}</div>
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Article Reading View (Markdown) */}
                                        {selectedLog.type === 'reading' && selectedLog.metadata?.content_preview && (
                                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                                <div className="bg-cyan-500/5 border border-cyan-500/20 p-3 rounded-lg flex items-center gap-3">
                                                    {selectedLog.metadata.img && <img src={selectedLog.metadata.img} className="w-8 h-8 rounded" />}
                                                    <div className="min-w-0">
                                                        <div className="text-xs text-cyan-500 font-mono uppercase">Source</div>
                                                        <a href={selectedLog.metadata.url} target="_blank" className="text-sm text-cyan-100 truncate hover:underline block">
                                                            {selectedLog.metadata.url}
                                                        </a>
                                                    </div>
                                                </div>

                                                <div className="prose prose-invert prose-sm max-w-none bg-neutral-950/50 p-4 rounded-lg border border-neutral-800">
                                                    <ReactMarkdown
                                                        components={{
                                                            img: ({ node, ...props }) => {
                                                                if (!props.src) return null;
                                                                return <img {...props} style={{ maxWidth: '100%', height: 'auto', borderRadius: '0.5rem' }} />;
                                                            }
                                                        }}
                                                    >
                                                        {selectedLog.metadata.content_preview}
                                                    </ReactMarkdown>
                                                </div>
                                            </div>
                                        )}

                                        {/* Fallback JSON View */}
                                        {selectedLog.metadata && !['searching', 'reading'].includes(selectedLog.type) && (
                                            <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800 font-mono text-xs overflow-x-auto">
                                                <pre className="text-green-400">
                                                    {JSON.stringify(selectedLog.metadata, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- Sub-components ---

function StatBadge({ icon, label, value }: { icon: React.ReactNode, label: string, value: number }) {
    return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg">
            {icon}
            <div className="flex flex-col leading-none">
                <span className="text-[10px] text-neutral-500 uppercase font-bold">{label}</span>
                <span className="text-sm font-mono font-medium">{value}</span>
            </div>
        </div>
    );
}

function LogEntry({ log, isSelected, onClick }: { log: ActivityLog, isSelected: boolean, onClick: () => void }) {
    const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0;

    // Type Colors
    const colors = {
        thinking: "text-indigo-400 border-indigo-500/30 bg-indigo-500/5",
        searching: "text-amber-400 border-amber-500/30 bg-amber-500/5",
        reading: "text-cyan-400 border-cyan-500/30 bg-cyan-500/5",
        success: "text-green-400 border-green-500/30 bg-green-500/5",
        error: "text-red-400 border-red-500/30 bg-red-500/5",
        tool: "text-purple-400 border-purple-500/30 bg-purple-500/5",
        default: "text-neutral-400 border-neutral-800 hover:bg-neutral-800/50"
    };

    const style = colors[log.type as keyof typeof colors] || colors.default;

    return (
        <div
            onClick={hasMetadata ? onClick : undefined}
            className={cn(
                "group flex items-start gap-3 p-2 rounded cursor-pointer transition-all border-l-2",
                isSelected ? "bg-neutral-800 border-l-white" : "border-l-transparent hover:bg-neutral-800/30",
            )}
        >
            <div className="font-mono text-[10px] text-neutral-600 pt-1 shrink-0 w-16">
                {new Date(log.created_at).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    {log.type === 'searching' && <Search className="w-3 h-3 text-amber-500" />}
                    {log.type === 'reading' && <BookOpen className="w-3 h-3 text-cyan-500" />}
                    {log.type === 'thinking' && <Brain className="w-3 h-3 text-indigo-500" />}
                    {log.type === 'error' && <XCircle className="w-3 h-3 text-red-500" />}

                    <span className={cn("text-xs font-mono font-bold uppercase tracking-wider opacity-80", style.split(' ')[0])}>
                        {log.type}
                    </span>
                </div>

                <div className={cn("text-sm mt-0.5 truncate", log.type === 'thinking' ? "text-neutral-500 italic" : "text-neutral-300")}>
                    {log.message}
                </div>
            </div>

            {hasMetadata && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="w-4 h-4 text-neutral-600" />
                </div>
            )}
        </div>
    );
}
