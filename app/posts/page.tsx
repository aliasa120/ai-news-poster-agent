'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';
import {
    FileText,
    Copy,
    ExternalLink,
    Clock,
    CheckCircle2,
    Loader2,
    Trash2,
    AlertTriangle,
    RefreshCw,
    Heart,
    MessageCircle,
    Share2,
    Bookmark,
    MoreHorizontal,
    ThumbsUp,
    Send,
    Bot,
    Newspaper,
    Settings,
} from 'lucide-react';

interface GeneratedPost {
    id: string;
    x_post: string | null;
    instagram_caption: string | null;
    facebook_post: string | null;
    hashtags: string[] | null;
    reasoning: string;
    processed_at: string;
    news_items: {
        id: string;
        title: string;
        link: string;
        source_name: string | null;
        image_url: string | null;
        pub_date: string | null;
    } | null;
}

export default function PostsPage() {
    const [posts, setPosts] = useState<GeneratedPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'x' | 'instagram' | 'facebook'>('x');

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        try {
            setIsLoading(true);
            const res = await fetch('/api/posts');
            const data = await res.json();
            if (data.success) {
                setPosts(data.posts);
            }
        } catch (err) {
            console.error('Failed to fetch posts:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const deleteAllPosts = async () => {
        try {
            setIsDeleting(true);
            const res = await fetch('/api/posts', { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                setPosts([]);
                setShowDeleteConfirm(false);
            }
        } catch (err) {
            console.error('Failed to delete posts:', err);
        } finally {
            setIsDeleting(false);
        }
    };

    const copyToClipboard = async (text: string, id: string, platform: string) => {
        await navigator.clipboard.writeText(text);
        setCopiedId(`${id}-${platform}`);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-pink-950/10">
            {/* Top Actions Bar */}
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={fetchPosts} disabled={isLoading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
                {posts.length > 0 && (
                    <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete All
                    </Button>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <Card className="w-full max-w-md mx-4">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-destructive">
                                <AlertTriangle className="w-5 h-5" />
                                Delete All Posts?
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                This will delete all {posts.length} generated posts and reset the articles
                                so they can be processed again. This action cannot be undone.
                            </p>
                            <div className="flex gap-2 justify-end">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowDeleteConfirm(false)}
                                    disabled={isDeleting}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={deleteAllPosts}
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Trash2 className="w-4 h-4 mr-2" />
                                    )}
                                    Delete All
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Platform Tabs */}
                <div className="flex gap-2 mb-6 p-1 bg-muted rounded-lg w-fit">
                    <button
                        onClick={() => setActiveTab('x')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'x'
                            ? 'bg-black text-white dark:bg-white dark:text-black'
                            : 'hover:bg-muted-foreground/10'
                            }`}
                    >
                        𝕏 Twitter
                    </button>
                    <button
                        onClick={() => setActiveTab('instagram')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'instagram'
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                            : 'hover:bg-muted-foreground/10'
                            }`}
                    >
                        📸 Instagram
                    </button>
                    <button
                        onClick={() => setActiveTab('facebook')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'facebook'
                            ? 'bg-[#1877f2] text-white'
                            : 'hover:bg-muted-foreground/10'
                            }`}
                    >
                        📘 Facebook
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                ) : posts.length === 0 ? (
                    <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-20">
                            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No Generated Posts Yet</h3>
                            <p className="text-muted-foreground text-center">
                                Run the AI Agent to generate posts from news articles.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {posts.map((post) => (
                            <SocialPreviewCard
                                key={post.id}
                                post={post}
                                platform={activeTab}
                                copiedId={copiedId}
                                onCopy={copyToClipboard}
                                formatTime={formatTime}
                            />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

// Social Media Preview Card Component
function SocialPreviewCard({
    post,
    platform,
    copiedId,
    onCopy,
    formatTime,
}: {
    post: GeneratedPost;
    platform: 'x' | 'instagram' | 'facebook';
    copiedId: string | null;
    onCopy: (text: string, id: string, platform: string) => void;
    formatTime: (date: string) => string;
}) {
    const content = platform === 'x' ? post.x_post : platform === 'instagram' ? post.instagram_caption : post.facebook_post;
    const isCopied = copiedId === `${post.id}-${platform}`;

    if (!content) {
        return (
            <Card className="opacity-50">
                <CardContent className="flex items-center justify-center py-12">
                    <p className="text-sm text-muted-foreground">No {platform} content</p>
                </CardContent>
            </Card>
        );
    }

    // X/Twitter Preview
    if (platform === 'x') {
        return (
            <Card className="overflow-hidden bg-black text-white dark:bg-zinc-900">
                <CardContent className="p-4">
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                            PN
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                                <span className="font-bold text-sm">Pakistan News</span>
                                <span className="text-blue-400">✓</span>
                            </div>
                            <span className="text-zinc-500 text-sm">@PakistanNewsAI</span>
                        </div>
                        <MoreHorizontal className="w-5 h-5 text-zinc-500" />
                    </div>

                    {/* Content */}
                    <p className="text-[15px] leading-relaxed mb-3 whitespace-pre-wrap">{content}</p>

                    {/* Time */}
                    <p className="text-zinc-500 text-sm mb-3">{formatTime(post.processed_at)}</p>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                        <MessageCircle className="w-5 h-5 text-zinc-500" />
                        <RefreshCw className="w-5 h-5 text-zinc-500" />
                        <Heart className="w-5 h-5 text-zinc-500" />
                        <Share2 className="w-5 h-5 text-zinc-500" />
                        <button onClick={() => onCopy(content, post.id, platform)}>
                            {isCopied ? (
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                            ) : (
                                <Copy className="w-5 h-5 text-zinc-500 hover:text-white" />
                            )}
                        </button>
                    </div>

                    {/* Character count */}
                    <div className={`text-xs mt-2 ${content.length > 280 ? 'text-red-500' : 'text-zinc-500'}`}>
                        {content.length}/280
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Instagram Preview
    if (platform === 'instagram') {
        return (
            <Card className="overflow-hidden bg-white dark:bg-zinc-900">
                <CardContent className="p-0">
                    {/* Header */}
                    <div className="flex items-center justify-between p-3 border-b dark:border-zinc-800">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
                                <div className="w-full h-full rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center">
                                    <span className="text-xs font-bold">PN</span>
                                </div>
                            </div>
                            <span className="font-semibold text-sm">pakistannews.ai</span>
                        </div>
                        <MoreHorizontal className="w-5 h-5" />
                    </div>

                    {/* Image placeholder */}
                    <div className="aspect-square bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center">
                        <FileText className="w-16 h-16 text-white/50" />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-4">
                            <Heart className="w-6 h-6" />
                            <MessageCircle className="w-6 h-6" />
                            <Send className="w-6 h-6" />
                        </div>
                        <Bookmark className="w-6 h-6" />
                    </div>

                    {/* Caption */}
                    <div className="px-3 pb-3">
                        <p className="text-sm">
                            <span className="font-semibold">pakistannews.ai</span>{' '}
                            <span className="whitespace-pre-wrap">{content.slice(0, 150)}...</span>
                        </p>
                        <p className="text-zinc-500 text-xs mt-1">{formatTime(post.processed_at)}</p>
                    </div>

                    {/* Copy button */}
                    <div className="px-3 pb-3">
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => onCopy(content, post.id, platform)}
                        >
                            {isCopied ? (
                                <>
                                    <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <Copy className="w-4 h-4 mr-2" />
                                    Copy Caption
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Facebook Preview
    return (
        <Card className="overflow-hidden bg-white dark:bg-zinc-900">
            <CardContent className="p-0">
                {/* Header */}
                <div className="flex items-center gap-3 p-3">
                    <div className="w-10 h-10 rounded-full bg-[#1877f2] flex items-center justify-center text-white font-bold">
                        PN
                    </div>
                    <div className="flex-1">
                        <p className="font-semibold text-sm">Pakistan News AI</p>
                        <p className="text-xs text-zinc-500">{formatTime(post.processed_at)} · 🌐</p>
                    </div>
                    <MoreHorizontal className="w-5 h-5 text-zinc-500" />
                </div>

                {/* Content */}
                <div className="px-3 pb-3">
                    <p className="text-sm whitespace-pre-wrap">{content}</p>
                </div>

                {/* Link preview */}
                {post.news_items?.link && (
                    <a
                        href={post.news_items.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block mx-3 mb-3 border rounded-lg overflow-hidden hover:bg-muted/50 transition-colors"
                    >
                        <div className="h-32 bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 flex items-center justify-center">
                            <ExternalLink className="w-8 h-8 text-zinc-400" />
                        </div>
                        <div className="p-2 bg-muted/30">
                            <p className="text-xs text-zinc-500 uppercase">{post.news_items.source_name || 'news'}</p>
                            <p className="text-sm font-medium line-clamp-2">{post.news_items.title}</p>
                        </div>
                    </a>
                )}

                {/* Stats */}
                <div className="flex items-center justify-between px-3 py-2 border-t dark:border-zinc-800 text-zinc-500 text-sm">
                    <span>👍 12</span>
                    <span>3 comments · 1 share</span>
                </div>

                {/* Actions */}
                <div className="flex items-center border-t dark:border-zinc-800">
                    <button className="flex-1 flex items-center justify-center gap-2 py-3 hover:bg-muted/50 transition-colors">
                        <ThumbsUp className="w-5 h-5" />
                        <span className="text-sm font-medium">Like</span>
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-2 py-3 hover:bg-muted/50 transition-colors">
                        <MessageCircle className="w-5 h-5" />
                        <span className="text-sm font-medium">Comment</span>
                    </button>
                    <button
                        className="flex-1 flex items-center justify-center gap-2 py-3 hover:bg-muted/50 transition-colors"
                        onClick={() => onCopy(content, post.id, platform)}
                    >
                        {isCopied ? (
                            <>
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                <span className="text-sm font-medium text-green-500">Copied!</span>
                            </>
                        ) : (
                            <>
                                <Copy className="w-5 h-5" />
                                <span className="text-sm font-medium">Copy</span>
                            </>
                        )}
                    </button>
                </div>
            </CardContent>
        </Card>
    );
}
