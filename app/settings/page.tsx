'use client';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThemeToggle } from '@/components/theme-toggle';
import { Settings, Bot, Rss, FileText, Newspaper } from 'lucide-react';
import { AgentSettingsPanel } from './components/AgentSettingsPanel';
import { FeederSettingsPanel } from './components/FeederSettingsPanel';

export default function SettingsPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-slate-950/10">
            {/* Navigation */}
            <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/60 backdrop-blur-xl">
                <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 shadow-lg shadow-slate-500/25">
                                <Settings className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold">Settings</h1>
                                <p className="text-xs text-muted-foreground hidden sm:block">Configure Agent and Feeder preferences</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <a href="/agent"><Button variant="ghost" size="sm" className="gap-2"><Bot className="w-4 h-4" /><span className="hidden sm:inline">Agent</span></Button></a>
                            <a href="/feeder"><Button variant="ghost" size="sm" className="gap-2"><Newspaper className="w-4 h-4" /><span className="hidden sm:inline">Feeder</span></Button></a>
                            <a href="/posts"><Button variant="ghost" size="sm" className="gap-2"><FileText className="w-4 h-4" /><span className="hidden sm:inline">Posts</span></Button></a>
                            <div className="ml-2 border-l border-border pl-2"><ThemeToggle /></div>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-4xl mx-auto p-6">
                {/* Settings Tabs */}
                <Tabs defaultValue="agent" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-2 h-14 bg-secondary/50">
                        <TabsTrigger
                            value="agent"
                            className="flex items-center gap-2 h-12 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                        >
                            <Bot className="w-5 h-5" />
                            <span className="font-medium">Agent</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="feeder"
                            className="flex items-center gap-2 h-12 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                        >
                            <Rss className="w-5 h-5" />
                            <span className="font-medium">Feeder</span>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="agent" className="space-y-4">
                        <AgentSettingsPanel />
                    </TabsContent>

                    <TabsContent value="feeder" className="space-y-4">
                        <FeederSettingsPanel />
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}
