'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Cpu, Hash, ArrowUpDown, Timer, Loader2, Check, Bot, Globe, Search } from 'lucide-react';
import { AgentSettings, AVAILABLE_MODELS, SCRAPING_PROVIDERS, SEARCH_PROVIDERS } from '@/lib/agent/types';

export function AgentSettingsPanel() {
    const [settings, setSettings] = useState<AgentSettings | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Fetch settings on mount
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch('/api/agent');
                const data = await res.json();
                if (data.success && data.settings) {
                    setSettings(data.settings);
                }
            } catch (err) {
                console.error('Failed to fetch agent settings:', err);
            }
        };
        fetchSettings();
    }, []);

    // Update settings
    const updateSetting = async (key: keyof AgentSettings, value: unknown) => {
        if (!settings) return;

        setIsSaving(true);
        setSaveSuccess(false);

        try {
            const res = await fetch('/api/agent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update_settings', settings: { [key]: value } }),
            });
            const data = await res.json();
            if (data.success) {
                setSettings(data.settings);
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
            {/* Model Selection */}
            <Card className="bg-card border-border">
                <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                            <Cpu className="w-5 h-5 text-purple-500" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">AI Model</CardTitle>
                            <CardDescription>Select the language model for generating posts</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Select
                        value={settings.model}
                        onValueChange={(value) => updateSetting('model', value)}
                        disabled={isSaving}
                    >
                        <SelectTrigger className="w-full h-12 bg-secondary border-border">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                            {AVAILABLE_MODELS.map((model) => (
                                <SelectItem key={model.id} value={model.id} className="py-3">
                                    <div className="flex flex-col">
                                        <span className="font-medium">{model.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {model.id.includes('cerebras') ? 'Cerebras' : 'Groq'}
                                        </span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            {/* Batch Size */}
            <Card className="bg-card border-border">
                <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Hash className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Batch Size</CardTitle>
                            <CardDescription>Number of articles to process per run</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Select
                        value={String(settings.batch_size)}
                        onValueChange={(value) => updateSetting('batch_size', parseInt(value))}
                        disabled={isSaving}
                    >
                        <SelectTrigger className="w-full h-12 bg-secondary border-border">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                            {[3, 5, 10, 15, 20, 25, 30].map((size) => (
                                <SelectItem key={size} value={String(size)}>
                                    {size} articles
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            {/* Scraping Provider */}
            <Card className="bg-card border-border">
                <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-cyan-500/10 rounded-lg">
                            <Globe className="w-5 h-5 text-cyan-500" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Scraping Provider</CardTitle>
                            <CardDescription>How to fetch article content for analysis</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Select
                        value={settings.scraping_provider || 'auto'}
                        onValueChange={(value) => updateSetting('scraping_provider', value)}
                        disabled={isSaving}
                    >
                        <SelectTrigger className="w-full h-12 bg-secondary border-border">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                            {SCRAPING_PROVIDERS.map((provider) => (
                                <SelectItem key={provider.id} value={provider.id} className="py-3">
                                    <div className="flex flex-col">
                                        <span className="font-medium">{provider.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {provider.description}
                                        </span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="mt-3 p-3 bg-secondary/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">
                            <strong>Jina Free (20 req/min)</strong> - Agent auto-waits when limit reached<br />
                            <strong>Jina API (200 req/min)</strong> - Requires JINA_API_KEY env var<br />
                            <strong>Exa AI</strong> - Requires EXA_API_KEY env var
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Search Provider */}
            <Card className="bg-card border-border">
                <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-500/10 rounded-lg">
                            <Search className="w-5 h-5 text-yellow-500" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Search Provider</CardTitle>
                            <CardDescription>How to search for verification and context</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Select
                        value={settings.search_provider || 'serper'}
                        onValueChange={(value) => updateSetting('search_provider', value)}
                        disabled={isSaving}
                    >
                        <SelectTrigger className="w-full h-12 bg-secondary border-border">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                            {SEARCH_PROVIDERS.map((provider) => (
                                <SelectItem key={provider.id} value={provider.id} className="py-3">
                                    <div className="flex flex-col">
                                        <span className="font-medium">{provider.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {provider.description}
                                        </span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="mt-3 p-3 bg-secondary/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">
                            <strong>Serper</strong> - Paid Google search API (requires SERPER_API_KEY)<br />
                            <strong>SearXNG</strong> - Self-hosted meta-search (uses SEARXNG_URL env var)
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Order Settings */}
            <Card className="bg-card border-border">
                <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/10 rounded-lg">
                            <ArrowUpDown className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Processing Order</CardTitle>
                            <CardDescription>How to sort articles for processing</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm text-muted-foreground mb-2 block">Order By</label>
                            <Select
                                value={settings.order_by}
                                onValueChange={(value) => updateSetting('order_by', value)}
                                disabled={isSaving}
                            >
                                <SelectTrigger className="h-12 bg-secondary border-border">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-popover border-border">
                                    <SelectItem value="pub_date">Publish Date</SelectItem>
                                    <SelectItem value="created_at">Fetched Date</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm text-muted-foreground mb-2 block">Direction</label>
                            <Select
                                value={settings.order_direction}
                                onValueChange={(value) => updateSetting('order_direction', value as 'asc' | 'desc')}
                                disabled={isSaving}
                            >
                                <SelectTrigger className="h-12 bg-secondary border-border">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-popover border-border">
                                    <SelectItem value="desc">Newest First</SelectItem>
                                    <SelectItem value="asc">Oldest First</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Auto-Run Timer */}
            <Card className="bg-card border-border">
                <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-500/10 rounded-lg">
                            <Timer className="w-5 h-5 text-orange-500" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Auto-Run Interval</CardTitle>
                            <CardDescription>How often to automatically run the agent</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Select
                        value={String(settings.auto_run_interval || 60)}
                        onValueChange={(value) => updateSetting('auto_run_interval', parseInt(value))}
                        disabled={isSaving}
                    >
                        <SelectTrigger className="w-full h-12 bg-secondary border-border">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                            <SelectItem value="5">5 minutes</SelectItem>
                            <SelectItem value="10">10 minutes</SelectItem>
                            <SelectItem value="15">15 minutes</SelectItem>
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="60">1 hour</SelectItem>
                            <SelectItem value="120">2 hours</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-2">
                        Enable auto-run on the Agent page to use this interval
                    </p>
                </CardContent>
            </Card>

            {/* Save Indicator */}
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
