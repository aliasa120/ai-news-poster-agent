'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { Bot, Newspaper, FileText, Settings } from 'lucide-react';

interface AppNavbarProps {
    title?: string;
    subtitle?: string;
    icon?: React.ReactNode;
    isActive?: boolean;
}

const NAV_ITEMS = [
    { href: '/agent', icon: Bot, label: 'Agent' },
    { href: '/feeder', icon: Newspaper, label: 'Feeder' },
    { href: '/posts', icon: FileText, label: 'Posts' },
    { href: '/settings', icon: Settings, label: 'Settings' },
];

export function AppNavbar({ title = 'AI News Agent', subtitle, icon, isActive }: AppNavbarProps) {
    const pathname = usePathname();

    return (
        <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex h-14 items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
                                {icon || <Bot className="w-5 h-5 text-white" />}
                            </div>
                            {isActive && (
                                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                    <span className="animate-ping absolute h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative rounded-full h-3 w-3 bg-green-500"></span>
                                </span>
                            )}
                        </div>
                        <div>
                            <h1 className="text-lg font-bold">{title}</h1>
                            {subtitle && (
                                <p className="text-xs text-muted-foreground">{subtitle}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {NAV_ITEMS.map((item) => (
                            <Link key={item.href} href={item.href}>
                                <Button
                                    variant={pathname === item.href ? 'secondary' : 'ghost'}
                                    size="sm"
                                    className="gap-1.5"
                                >
                                    <item.icon className="w-4 h-4" />
                                    <span className="hidden sm:inline">{item.label}</span>
                                </Button>
                            </Link>
                        ))}
                        <div className="ml-2 border-l border-border pl-2">
                            <ThemeToggle />
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}
