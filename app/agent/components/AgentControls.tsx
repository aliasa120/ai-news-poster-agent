'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Square, Loader2, Zap, Timer, Power, Pause } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface AgentControlsProps {
    isRunning: boolean;
    isStarting: boolean;
    isCancelling: boolean;
    onStart: () => void;
    onStop: () => void;
    autoRunEnabled: boolean;
    onToggleAutoRun: (enabled: boolean) => void;
    countdownSeconds: number;
    processedCount: number;
    totalArticles: number;
}

function formatCountdown(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function AgentControls({
    isRunning,
    isStarting,
    isCancelling,
    onStart,
    onStop,
    autoRunEnabled,
    onToggleAutoRun,
    countdownSeconds,
    processedCount,
    totalArticles,
}: AgentControlsProps) {
    return (
        <Card className={isRunning ? 'ring-2 ring-green-500/30' : ''}>
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    Control
                    {isRunning && (
                        <Badge className="ml-auto bg-green-500/20 text-green-500 border-0 text-xs">
                            Running
                        </Badge>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Start/Stop Button */}
                {isRunning ? (
                    <Button
                        variant="destructive"
                        className="w-full"
                        onClick={onStop}
                        disabled={isCancelling}
                    >
                        {isCancelling ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Square className="w-4 h-4 mr-2" />
                        )}
                        {isCancelling ? 'Stopping...' : 'Stop'}
                    </Button>
                ) : (
                    <Button
                        className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
                        onClick={onStart}
                        disabled={isStarting}
                    >
                        {isStarting ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Play className="w-4 h-4 mr-2" />
                        )}
                        {isStarting ? 'Starting...' : 'Start Agent'}
                    </Button>
                )}

                {/* Progress */}
                {isRunning && totalArticles > 0 && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Progress</span>
                            <span>{processedCount}/{totalArticles}</span>
                        </div>
                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-300"
                                style={{ width: `${(processedCount / totalArticles) * 100}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Auto-Run Toggle */}
                <div className="border-t border-border pt-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Timer className="w-4 h-4 text-orange-500" />
                            <span className="text-sm font-medium">Auto-Run</span>
                        </div>
                        <Switch
                            checked={autoRunEnabled}
                            onCheckedChange={onToggleAutoRun}
                            disabled={isRunning}
                        />
                    </div>
                    {autoRunEnabled && !isRunning && countdownSeconds > 0 && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                            <Pause className="w-3 h-3" />
                            Next run in: <span className="font-mono text-foreground">{formatCountdown(countdownSeconds)}</span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
