'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { NewsItem, FeederSettings, FeedResponse, SettingsResponse } from '@/lib/types';
import { FeedList } from './components/FeedList';
import { FeedSettings } from './components/FeedSettings';
import { FetchHistory } from './components/FetchHistory';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import {
    AlertCircle,
    Newspaper,
    Sparkles,
    Trash2,
    BarChart3,
    TrendingUp,
    Database,
    Bot,
    FileText,
    Settings,
} from 'lucide-react';

export default function FeederPage() {
    const [items, setItems] = useState<NewsItem[]>([]);
    const [settings, setSettings] = useState<FeederSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [stats, setStats] = useState({ total: 0, newCount: 0, duplicatesSkipped: 0 });
    const [error, setError] = useState<string | null>(null);
    const [historyRefresh, setHistoryRefresh] = useState(0);

    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    useEffect(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        if (settings?.is_active && settings?.refresh_interval) {
            intervalRef.current = setInterval(() => {
                fetchFromRSS();
            }, settings.refresh_interval);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [settings?.is_active, settings?.refresh_interval]);

    useEffect(() => {
        if (settings) {
            loadFromDatabase();
        }
    }, [settings !== null]);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/feeder/settings');
            const data: SettingsResponse = await res.json();
            if (data.success && data.settings) {
                setSettings(data.settings);
            }
        } catch (err) {
            console.error('Failed to fetch settings:', err);
        }
    };

    const loadFromDatabase = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/feeder');
            const data: FeedResponse = await res.json();

            if (data.success) {
                setItems(data.items);
                setStats({ total: data.totalCount, newCount: 0, duplicatesSkipped: 0 });
            } else {
                setError(data.error || 'Failed to load feed');
            }
        } catch (err) {
            setError('Network error. Please try again.');
            console.error('Feed load error:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchFromRSS = useCallback(async () => {
        setIsRefreshing(true);
        setError(null);

        try {
            const res = await fetch('/api/feeder?refresh=true');
            const data: FeedResponse = await res.json();

            if (data.success) {
                setItems(data.items);
                setStats({
                    total: data.totalCount,
                    newCount: data.newCount,
                    duplicatesSkipped: data.duplicatesSkipped || 0
                });
                // Trigger history refresh
                setHistoryRefresh((prev) => prev + 1);
            } else {
                setError(data.error || 'Failed to fetch feed');
            }
        } catch (err) {
            setError('Network error. Please try again.');
            console.error('Feed fetch error:', err);
        } finally {
            setIsRefreshing(false);
        }
    }, []);

    const handleDeleteAll = async () => {
        if (!confirm('Are you sure you want to delete ALL news items? This cannot be undone.')) {
            return;
        }

        setIsDeleting(true);
        setError(null);

        try {
            const res = await fetch('/api/feeder', { method: 'DELETE' });
            const data = await res.json();

            if (data.success) {
                setItems([]);
                setStats({ total: 0, newCount: 0, duplicatesSkipped: 0 });
            } else {
                setError(data.error || 'Failed to delete items');
            }
        } catch (err) {
            setError('Failed to delete items. Please try again.');
            console.error('Delete error:', err);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSettingsChange = async (newSettings: Partial<FeederSettings>) => {
        try {
            const res = await fetch('/api/feeder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSettings),
            });

            const data: SettingsResponse = await res.json();
            if (data.success && data.settings) {
                setSettings(data.settings);
            }
        } catch (err) {
            console.error('Failed to update settings:', err);
        }
    };

    const newItemsInView = items.filter((item) => item.is_new).length;

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-blue-950/10">
            {/* Top Navigation */}
            <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/60 backdrop-blur-xl">
                <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 shadow-lg shadow-blue-500/25">
                                <Newspaper className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold">News Feeder</h1>
                                <p className="text-xs text-muted-foreground hidden sm:block">Pakistan News • Google RSS</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <a href="/agent"><Button variant="ghost" size="sm" className="gap-2"><Bot className="w-4 h-4" /><span className="hidden sm:inline">Agent</span></Button></a>
                            <a href="/posts"><Button variant="ghost" size="sm" className="gap-2"><FileText className="w-4 h-4" /><span className="hidden sm:inline">Posts</span></Button></a>
                            <a href="/settings"><Button variant="ghost" size="sm" className="gap-2"><Settings className="w-4 h-4" /><span className="hidden sm:inline">Settings</span></Button></a>
                            <div className="ml-2 border-l border-border pl-2"><ThemeToggle /></div>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    <Card className="bg-card border-border">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p>
                                    <p className="text-2xl font-bold">{stats.total}</p>
                                </div>
                                <Database className="w-8 h-8 text-muted-foreground/50" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">New Fetched</p>
                                    <p className="text-2xl font-bold text-primary">{stats.newCount}</p>
                                </div>
                                <TrendingUp className="w-8 h-8 text-primary/50" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">New in View</p>
                                    <p className="text-2xl font-bold text-success">{newItemsInView}</p>
                                </div>
                                <Sparkles className="w-8 h-8 text-success/50" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Duplicates</p>
                                    <p className="text-2xl font-bold text-muted-foreground">{stats.duplicatesSkipped}</p>
                                </div>
                                <BarChart3 className="w-8 h-8 text-muted-foreground/50" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Controls & History Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                    <div className="lg:col-span-2 space-y-4">
                        {/* Settings */}
                        <FeedSettings
                            settings={settings}
                            onSettingsChange={handleSettingsChange}
                            onRefresh={fetchFromRSS}
                            isRefreshing={isRefreshing}
                        />

                        {/* Actions */}
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Latest Articles</h2>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleDeleteAll}
                                disabled={isDeleting || items.length === 0}
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                {isDeleting ? 'Deleting...' : 'Delete All'}
                            </Button>
                        </div>
                    </div>

                    {/* Fetch History */}
                    <div className="order-first lg:order-last">
                        <FetchHistory refreshTrigger={historyRefresh} />
                    </div>
                </div>

                {/* Error Banner */}
                {error && (
                    <Card className="mb-6 bg-destructive/10 border-destructive/50">
                        <CardContent className="py-4 flex items-center justify-between">
                            <div className="flex items-center gap-3 text-destructive">
                                <AlertCircle className="w-5 h-5" />
                                <span>{error}</span>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={loadFromDatabase}
                                className="border-destructive/50 text-destructive hover:bg-destructive/20"
                            >
                                Retry
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* News Feed */}
                <FeedList items={items} isLoading={isLoading} />
            </main>
        </div>
    );
}
