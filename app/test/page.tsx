'use client';

import { useState, useEffect, ChangeEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, Search, Globe, FileText, Zap } from 'lucide-react';

interface TestResult {
    success: boolean;
    data?: unknown;
    error?: string;
    time: number;
}

interface EnvStatus {
    SERPER_API_KEY: boolean;
    SEARXNG_URL: string;
    JINA_API_KEY: boolean;
}

export default function TestPage() {
    const [query, setQuery] = useState('Pakistan news today');
    const [url, setUrl] = useState('https://www.dawn.com');
    const [results, setResults] = useState<Record<string, TestResult | null>>({});
    const [loading, setLoading] = useState<Record<string, boolean>>({});
    const [envStatus, setEnvStatus] = useState<EnvStatus | null>(null);

    useEffect(() => {
        // Fetch env status on load
        fetch('/api/test')
            .then(res => res.json())
            .then(data => setEnvStatus(data.env))
            .catch(console.error);
    }, []);

    const testApi = async (api: string) => {
        setLoading(prev => ({ ...prev, [api]: true }));
        setResults(prev => ({ ...prev, [api]: null }));

        try {
            const res = await fetch('/api/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ api, query, url }),
            });
            const data = await res.json();
            setResults(prev => ({ ...prev, [api]: data }));
        } catch (err) {
            setResults(prev => ({
                ...prev,
                [api]: { success: false, error: 'Network error', time: 0 },
            }));
        } finally {
            setLoading(prev => ({ ...prev, [api]: false }));
        }
    };

    const testAllApis = async () => {
        const apis = ['serper_search', 'serper_news', 'searxng_search', 'searxng_news', 'jina_free', 'jina_api'];
        for (const api of apis) {
            await testApi(api);
        }
    };

    const ApiCard = ({
        api,
        title,
        icon: Icon,
        color
    }: {
        api: string;
        title: string;
        icon: React.ElementType;
        color: string;
    }) => {
        const result = results[api];
        const isLoading = loading[api];

        return (
            <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-lg ${color}`}>
                                <Icon className="w-4 h-4" />
                            </div>
                            <CardTitle className="text-sm font-medium">{title}</CardTitle>
                        </div>
                        <Button
                            size="sm"
                            onClick={() => testApi(api)}
                            disabled={isLoading}
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Test'}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {result && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                {result.success ? (
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                ) : (
                                    <XCircle className="w-4 h-4 text-red-500" />
                                )}
                                <Badge variant={result.success ? 'default' : 'destructive'}>
                                    {result.success ? 'Success' : 'Failed'}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                    {result.time}ms
                                </span>
                            </div>
                            {result.error && (
                                <p className="text-xs text-red-400 bg-red-500/10 p-2 rounded">
                                    {result.error}
                                </p>
                            )}
                            {result.data !== undefined && result.data !== null ? (
                                <pre className="text-xs bg-secondary/50 p-2 rounded overflow-auto max-h-64">
                                    {JSON.stringify(result.data, null, 2)}
                                </pre>
                            ) : null}
                        </div>
                    )}
                    {!result && !isLoading && (
                        <p className="text-xs text-muted-foreground">Click Test to check this API</p>
                    )}
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">API Testing</h1>
                        <p className="text-muted-foreground">Test each API individually</p>
                    </div>
                    <Button onClick={testAllApis} size="lg">
                        <Zap className="w-4 h-4 mr-2" />
                        Test All APIs
                    </Button>
                </div>

                {/* Environment Status */}
                {envStatus && (
                    <Card className="bg-card border-border">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm">Environment Variables</CardTitle>
                        </CardHeader>
                        <CardContent className="flex gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-xs">SERPER_API_KEY:</span>
                                <Badge variant={envStatus.SERPER_API_KEY ? 'default' : 'secondary'}>
                                    {envStatus.SERPER_API_KEY ? '✓ Set' : '✗ Not set'}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs">JINA_API_KEY:</span>
                                <Badge variant={envStatus.JINA_API_KEY ? 'default' : 'secondary'}>
                                    {envStatus.JINA_API_KEY ? '✓ Set' : '✗ Not set'}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs">SEARXNG_URL:</span>
                                <Badge variant={envStatus.SEARXNG_URL !== 'Not set' ? 'default' : 'secondary'}>
                                    {envStatus.SEARXNG_URL !== 'Not set' ? '✓ ' + envStatus.SEARXNG_URL : '✗ Not set'}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Test Inputs */}
                <Card className="bg-card border-border">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Test Parameters</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-muted-foreground block mb-1">Search Query</label>
                            <input
                                className="w-full h-10 px-3 bg-secondary border border-border rounded-md text-sm"
                                value={query}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                                placeholder="Pakistan news today"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground block mb-1">URL for Jina</label>
                            <input
                                className="w-full h-10 px-3 bg-secondary border border-border rounded-md text-sm"
                                value={url}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
                                placeholder="https://example.com/article"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* API Tests Grid */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Serper */}
                    <ApiCard
                        api="serper_search"
                        title="Serper Google Search"
                        icon={Search}
                        color="bg-blue-500/10 text-blue-500"
                    />
                    <ApiCard
                        api="serper_news"
                        title="Serper News Search"
                        icon={Search}
                        color="bg-blue-500/10 text-blue-500"
                    />

                    {/* SearXNG */}
                    <ApiCard
                        api="searxng_search"
                        title="SearXNG Search"
                        icon={Globe}
                        color="bg-yellow-500/10 text-yellow-500"
                    />
                    <ApiCard
                        api="searxng_news"
                        title="SearXNG News"
                        icon={Globe}
                        color="bg-yellow-500/10 text-yellow-500"
                    />

                    {/* Jina */}
                    <ApiCard
                        api="jina_free"
                        title="Jina AI (Free 20/min)"
                        icon={FileText}
                        color="bg-cyan-500/10 text-cyan-500"
                    />
                    <ApiCard
                        api="jina_api"
                        title="Jina AI (API Key)"
                        icon={FileText}
                        color="bg-purple-500/10 text-purple-500"
                    />
                </div>
            </div>
        </div>
    );
}
