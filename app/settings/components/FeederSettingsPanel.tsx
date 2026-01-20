'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { RefreshCw, Database, Clock, Loader2, Check } from 'lucide-react';
import { FeederSettings } from '@/lib/types';

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

export function FeederSettingsPanel() {
    const [settings, setSettings] = useState<FeederSettings | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch('/api/feeder/settings');
                const data = await res.json();
                if (data.success && data.settings) {
                    setSettings(data.settings);
                }
            } catch (err) {
                console.error('Failed to fetch feeder settings:', err);
            }
        };
        fetchSettings();
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
