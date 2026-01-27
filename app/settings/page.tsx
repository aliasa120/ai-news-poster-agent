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
