'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { RefreshCw, Database, Clock, Loader2, Check, Bot, AlertTriangle, Trash2, Shield } from 'lucide-react';
import { FeederSettings } from '@/lib/types';
import { FeederSettings as NewFeederSettings, AI_MODELS, AIProvider, DEFAULT_FEEDER_SETTINGS } from '@/lib/feeder/types';

const INTERVAL_OPTIONS = [
    { value: '300000', label: '5 minutes' },
    { value: '600000', label: '10 minutes' },
    { value: '900000', label: '15 minutes' },
    { value: '1800000', label: '30 minutes' },
    { value: '3600000', label: '1 hour' },
];

const RETENTION_OPTIONS = [
    { value: '10', label: '10 articles' },
    { value: '20', label: '20 articles' },
    { value: '30', label: '30 articles' },
    { value: '50', label: '50 articles' },
    { value: '100', label: '100 articles' },
    { value: '200', label: '200 articles' },
];

const FRESHNESS_OPTIONS = [
    { value: '0', label: 'All (no filter)' },
    { value: '1', label: '1 hour' },
    { value: '2', label: '2 hours' },
    { value: '6', label: '6 hours' },
    { value: '12', label: '12 hours' },
    { value: '24', label: '24 hours' },
];

const MAX_CHECK_OPTIONS = [
    { value: '100', label: '100 titles' },
    { value: '200', label: '200 titles' },
    { value: '300', label: '300 titles' },
    { value: '500', label: '500 titles (max)' },
];

export function FeederSettingsPanel() {
    const [settings, setSettings] = useState<FeederSettings | null>(null);
    const [feederSettings, setFeederSettings] = useState<NewFeederSettings>(DEFAULT_FEEDER_SETTINGS);
    const [storageStats, setStorageStats] = useState({ guids: 0, hashes: 0, titles: 0 });
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [isClearing, setIsClearing] = useState<string | null>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch('/api/feeder/settings');
                const data = await res.json();
                if (data.success) {
                    if (data.settings) setSettings(data.settings);
                    if (data.feederSettings) setFeederSettings(data.feederSettings);
                }
            } catch (err) {
                console.error('Failed to fetch feeder settings:', err);
            }
        };

        const fetchStats = async () => {
            try {
                const res = await fetch('/api/feeder/clear');
                const data = await res.json();
                if (data.success && data.stats) {
                    setStorageStats(data.stats);
                }
            } catch (err) {
                console.error('Failed to fetch storage stats:', err);
            }
        };

        fetchSettings();
        fetchStats();
    }, []);

    const updateSetting = async (updates: Partial<FeederSettings>) => {
        if (!settings) return;

        setIsSaving(true);
        setSaveSuccess(false);

        try {
            const res = await fetch('/api/feeder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });
            const data = await res.json();
            if (data.success) {
                setSettings(prev => prev ? { ...prev, ...updates } : null);
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 2000);
            }
        } catch {
            console.error('Update failed');
        } finally {
            setIsSaving(false);
        }
    };

    const updateFeederSetting = async (updates: Partial<NewFeederSettings>) => {
        setIsSaving(true);
        setSaveSuccess(false);

        try {
            const res = await fetch('/api/feeder/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });
            const data = await res.json();
            if (data.success) {
                setFeederSettings(prev => ({ ...prev, ...updates }));
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 2000);
            }
        } catch {
            console.error('Update failed');
        } finally {
            setIsSaving(false);
        }
    };

    const clearStorage = async (type: 'guids' | 'hashes' | 'titles' | 'all') => {
        if (!confirm(`Are you sure you want to clear ${type === 'all' ? 'ALL deduplication data' : type}? This cannot be undone.`)) {
            return;
        }

        setIsClearing(type);
        try {
            const res = await fetch('/api/feeder/clear', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type }),
            });
            const data = await res.json();
            if (data.success) {
                // Refresh stats
                const statsRes = await fetch('/api/feeder/clear');
                const statsData = await statsRes.json();
                if (statsData.success && statsData.stats) {
                    setStorageStats(statsData.stats);
                }
            }
        } catch (err) {
            console.error('Failed to clear storage:', err);
        } finally {
            setIsClearing(null);
        }
    };

    if (!settings) {
        return (
            <Card className="bg-card border-border">
                <CardContent className="flex items-center justify-center h-40">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* AI Verification & Source Filtering Removed as per new L3-L5 Pipeline */}

            {/* Auto-Refresh */}
            <Card className="bg-card border-border">
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <RefreshCw className="w-5 h-5 text-blue-500" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">Auto-Refresh</CardTitle>
                                <CardDescription>Automatically fetch new articles</CardDescription>
                            </div>
                        </div>
                        <Switch
                            checked={settings.is_active}
                            onCheckedChange={(checked) => updateSetting({ is_active: checked })}
                            disabled={isSaving}
                        />
                    </div>
                </CardHeader>
                {settings.is_active && (
                    <CardContent className="pt-0">
                        <label className="text-sm text-muted-foreground mb-2 block">Refresh Interval</label>
                        <Select
                            value={String(settings.refresh_interval)}
                            onValueChange={(value) => updateSetting({ refresh_interval: parseInt(value) })}
                            disabled={isSaving}
                        >
                            <SelectTrigger className="w-full h-12 bg-secondary border-border">
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
                    </CardContent>
                )}
            </Card>

            {/* Max Retention */}
            <Card className="bg-card border-border">
                <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                            <Database className="w-5 h-5 text-purple-500" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Max Retention</CardTitle>
                            <CardDescription>Maximum articles to keep in database</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Select
                        value={String(settings.max_retention || 100)}
                        onValueChange={(value) => updateSetting({ max_retention: parseInt(value) })}
                        disabled={isSaving}
                    >
                        <SelectTrigger className="w-full h-12 bg-secondary border-border">
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
                </CardContent>
            </Card>

            {/* Freshness Filter */}
            <Card className="bg-card border-border">
                <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-500/10 rounded-lg">
                            <Clock className="w-5 h-5 text-orange-500" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Freshness Filter</CardTitle>
                            <CardDescription>Only fetch articles published within this time</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Select
                        value={String(settings.freshness_hours || 0)}
                        onValueChange={(value) => updateSetting({ freshness_hours: parseInt(value) || undefined })}
                        disabled={isSaving}
                    >
                        <SelectTrigger className="w-full h-12 bg-secondary border-border">
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
                </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="bg-card border-red-500/30">
                <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-500/10 rounded-lg">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                            <CardTitle className="text-lg text-red-400">Danger Zone</CardTitle>
                            <CardDescription>Clear permanent deduplication data</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Storage Stats */}
                    <div className="grid grid-cols-4 gap-4 p-4 bg-secondary/50 rounded-lg">
                        <div className="text-center">
                            <div className="text-2xl font-bold">{storageStats.guids}</div>
                            <div className="text-xs text-muted-foreground">GUIDs</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold">{storageStats.hashes}</div>
                            <div className="text-xs text-muted-foreground">Hashes</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold">{storageStats.titles}</div>
                            <div className="text-xs text-muted-foreground">Titles</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold">{(storageStats as any).fingerprints || 0}</div>
                            <div className="text-xs text-muted-foreground">Fingerprints</div>
                        </div>
                    </div>

                    {/* Clear Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                        <Button
                            variant="outline"
                            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                            onClick={() => clearStorage('guids')}
                            disabled={isClearing !== null}
                        >
                            {isClearing === 'guids' ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Trash2 className="w-4 h-4 mr-2" />
                            )}
                            Clear GUIDs
                        </Button>
                        <Button
                            variant="outline"
                            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                            onClick={() => clearStorage('hashes')}
                            disabled={isClearing !== null}
                        >
                            {isClearing === 'hashes' ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Trash2 className="w-4 h-4 mr-2" />
                            )}
                            Clear Hashes
                        </Button>
                        <Button
                            variant="outline"
                            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                            onClick={() => clearStorage('titles')}
                            disabled={isClearing !== null}
                        >
                            {isClearing === 'titles' ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Trash2 className="w-4 h-4 mr-2" />
                            )}
                            Clear Titles
                        </Button>
                        <Button
                            variant="outline"
                            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                            onClick={() => clearStorage('fingerprints' as any)}
                            disabled={isClearing !== null}
                        >
                            {isClearing === 'fingerprints' ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Trash2 className="w-4 h-4 mr-2" />
                            )}
                            Clear Fingerprints
                        </Button>
                        <Button
                            variant="destructive"
                            className="bg-red-600 hover:bg-red-700 col-span-2"
                            onClick={() => clearStorage('all')}
                            disabled={isClearing !== null}
                        >
                            {isClearing === 'all' ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <AlertTriangle className="w-4 h-4 mr-2" />
                            )}
                            Reset All Data (Include Pinecone)
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {(isSaving || saveSuccess) && (
                <div className="flex items-center justify-center gap-2 text-sm">
                    {isSaving ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-muted-foreground">Saving...</span>
                        </>
                    ) : (
                        <>
                            <Check className="w-4 h-4 text-green-500" />
                            <span className="text-green-500">Saved!</span>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
