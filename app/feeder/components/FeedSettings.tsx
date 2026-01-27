'use client';

import { FeederSettings } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw, Loader2, Clock, Zap, Database, Timer, Square } from 'lucide-react';

interface FeedSettingsProps {
    settings: FeederSettings | null;
    onSettingsChange: (settings: Partial<FeederSettings>) => void;
    onRefresh: () => void;
    onStop?: () => void;
    isRefreshing: boolean;
}

const INTERVAL_OPTIONS = [
    { value: '300000', label: '5 min' },
    { value: '600000', label: '10 min' },
    { value: '900000', label: '15 min' },
    { value: '1800000', label: '30 min' },
    { value: '3600000', label: '1 hour' },
];

const RETENTION_OPTIONS = [
    { value: '10', label: '10' },
    { value: '20', label: '20' },
    { value: '30', label: '30' },
    { value: '50', label: '50' },
    { value: '100', label: '100' },
    { value: '200', label: '200' },
    { value: '300', label: '300' },
    { value: '500', label: '500' },
];

const FRESHNESS_OPTIONS = [
    { value: '0', label: 'All' },
    { value: '1', label: '1h' },
    { value: '2', label: '2h' },
    { value: '6', label: '6h' },
    { value: '12', label: '12h' },
    { value: '24', label: '24h' },
];

// AI Provider and Model Options REMOVED (Handled by Backend Agents)

export function FeedSettings({
    settings,
    onSettingsChange,
    onRefresh,
    onStop,
    isRefreshing,
}: FeedSettingsProps) {
    const lastFetchTime = settings?.last_fetch
        ? new Date(settings.last_fetch).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'Never';

    return (
        <Card className="bg-card border-border">
            <CardContent className="py-4">
                <div className="flex flex-wrap items-center gap-3 md:gap-4">
                    {/* Refresh Interval */}
                    <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <Select
                            value={String(settings?.refresh_interval || 900000)}
                            onValueChange={(value) =>
                                onSettingsChange({ refresh_interval: parseInt(value) })
                            }
                        >
                            <SelectTrigger className="w-20 h-8 bg-secondary border-border text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border-border">
                                {INTERVAL_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Max Retention */}
                    <div className="flex items-center gap-1.5">
                        <Database className="w-4 h-4 text-muted-foreground" />
                        <Select
                            value={String(settings?.max_retention || 100)}
                            onValueChange={(value) =>
                                onSettingsChange({ max_retention: parseInt(value) })
                            }
                        >
                            <SelectTrigger className="w-16 h-8 bg-secondary border-border text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border-border">
                                {RETENTION_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* News Freshness */}
                    <div className="flex items-center gap-1.5">
                        <Timer className="w-4 h-4 text-blue-500" />
                        <span className="text-xs text-muted-foreground">Fresh:</span>
                        <Select
                            value={String(settings?.freshness_hours || 0)}
                            onValueChange={(value) =>
                                onSettingsChange({ freshness_hours: parseInt(value) || undefined })
                            }
                        >
                            <SelectTrigger className="w-16 h-8 bg-secondary border-border text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border-border">
                                {FRESHNESS_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Auto-refresh toggle */}
                    <div className="flex items-center gap-1.5 ml-auto md:ml-0">
                        <Zap className={`w-4 h-4 ${settings?.is_active ? 'text-green-500' : 'text-muted-foreground'}`} />
                        <Switch
                            checked={settings?.is_active || false}
                            onCheckedChange={(checked) => onSettingsChange({ is_active: checked })}
                        />
                    </div>

                    {/* Last fetch time */}
                    <div className="text-xs text-muted-foreground hidden sm:block ml-auto">
                        Last: <span className="font-medium">{lastFetchTime}</span>
                    </div>

                    {/* Refresh/Stop Button */}
                    {isRefreshing ? (
                        <Button
                            onClick={onStop}
                            size="sm"
                            variant="destructive"
                            className="ml-auto h-8"
                        >
                            <Square className="w-4 h-4 mr-1.5" />
                            Stop
                        </Button>
                    ) : (
                        <Button
                            onClick={onRefresh}
                            size="sm"
                            className="ml-auto h-8"
                        >
                            <RefreshCw className="w-4 h-4 mr-1.5" />
                            Refresh
                        </Button>
                    )}
                </div>

                {/* Info about settings */}
                <div className="mt-2 text-[11px] text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                    <span>⏱️ Auto-refresh interval</span>
                    <span>📦 Max articles to keep</span>
                    <span>🔥 Only fetch news from last X hours</span>
                </div>
            </CardContent>
        </Card>
    );
}

