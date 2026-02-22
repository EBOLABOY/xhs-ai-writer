'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
 ArrowLeft,
 ArrowUp,
 Check,
 Clipboard,
 RefreshCw,
 Sparkles,
 AlertTriangle,
 FileText,
 Tags,
 TrendingUp,
 PartyPopper,
 ImagePlus,
 MessageCircle,
 Lightbulb,
 Calendar,
 Clock,
 Rocket,
 MessageSquare,
 Loader2
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { GeneratedContent } from '@/lib/types'

function BackgroundDecorations() {
 return null;
}

const titleRegex = /##\s*1[.、]?\s*(爆款标题创作|标题|生成标题)(\s*（\d+个）)?/i;
const bodyRegex = /##\s*2[.、]?\s*(正文内容|笔记正文|内容|正文|文案内容)/i;
const tagsRegex = /##\s*3[.、]?\s*(关键词标签|标签|关键词)(\s*（\d+-\d+个）)?/i;
const imagePromptRegex = /##\s*4[.、]?\s*(AI绘画提示词|绘画提示词|AI绘画|绘画提示)/i;
const selfCommentRegex = /##\s*5[.、]?\s*(首评关键词引导|首评)/i;
const strategyRegex = /##\s*6[.、]?\s*(发布策略建议|发布策略)/i;
const playbookRegex = /##\s*7[.、]?\s*(小红书增长 Playbook|增长 Playbook)/i;

const EMPTY_GENERATED_CONTENT: GeneratedContent = {
 titles: '',
 body: '',
 tags: [],
 imagePrompt: '',
 selfComment: '',
 strategy: '',
 playbook: ''
}

function GeneratePageContent() {
 const searchParams = useSearchParams()
 const router = useRouter()
 const [loading, setLoading] = useState(true)
 const [loadingStage, setLoadingStage] = useState('preparing')
 const [error, setError] = useState<string | null>(null)
 const [showScrollTop, setShowScrollTop] = useState(false)
 const [showRegeneratePrompt, setShowRegeneratePrompt] = useState(false)
 const [hasGenerated, setHasGenerated] = useState(false)
 const [generatedContent, setGeneratedContent] = useState<GeneratedContent>(EMPTY_GENERATED_CONTENT)

 // 新增一个 state 来追踪哪个按钮被点击了
 const [copiedButtonId, setCopiedButtonId] = useState<string | null>(null);
 const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

 // 流式生成相关状态
 const [displayContent, setDisplayContent] = useState('')
 const abortControllerRef = useRef<AbortController | null>(null);
 const generationSequenceRef = useRef(0);
 const startGenerationRef = useRef<() => Promise<void>>();

 // 解析内容的函数
 const parseContent = useCallback((content: string) => {
 // 查找各部分的位置
 const titleMatch = content.match(titleRegex);
 const bodyMatch = content.match(bodyRegex);
 const tagsMatch = content.match(tagsRegex);
 const imagePromptMatch = content.match(imagePromptRegex);
 const selfCommentMatch = content.match(selfCommentRegex);
 const strategyMatch = content.match(strategyRegex);
 const playbookMatch = content.match(playbookRegex);

 // 创建位置数组并排序
 const sections = [
 { name: 'title', match: titleMatch, index: titleMatch?.index ?? -1 },
 { name: 'body', match: bodyMatch, index: bodyMatch?.index ?? -1 },
 { name: 'tags', match: tagsMatch, index: tagsMatch?.index ?? -1 },
 { name: 'imagePrompt', match: imagePromptMatch, index: imagePromptMatch?.index ?? -1 },
 { name: 'selfComment', match: selfCommentMatch, index: selfCommentMatch?.index ?? -1 },
 { name: 'strategy', match: strategyMatch, index: strategyMatch?.index ?? -1 },
 { name: 'playbook', match: playbookMatch, index: playbookMatch?.index ?? -1 }
 ].filter(section => section.index !== -1).sort((a, b) => a.index - b.index);

 // 初始化内容变量
 let titles = '';
 let body = '';
 let tags: string[] = [];
 let imagePrompt = '';
 let selfComment = '';
 let strategy = '';
 let playbook = '';

 if (sections.length === 0) {
 // 如果一个标记都找不到，所有内容都暂时视为标题
 titles = content;
 } else {
 // 检查第一个标记之前是否有内容
 const firstSectionIndex = sections[0].index;
 if (firstSectionIndex > 0) {
 // 第一个标记之前的内容作为标题
 titles = content.substring(0, firstSectionIndex).trim();
 }
 }

 // 循环解析每个已识别的部分
 for (let i = 0; i < sections.length; i++) {
 const currentSection = sections[i];
 const nextSection = sections[i + 1];

 // 计算当前部分的开始和结束位置
 const startIndex = currentSection.index + (currentSection.match?.[0].length || 0);
 const endIndex = nextSection ? nextSection.index : content.length;

 const sectionContent = content.substring(startIndex, endIndex).trim();

 switch (currentSection.name) {
 case 'title':
 titles = sectionContent;
 break;
 case 'body':
 body = sectionContent;
 break;
 case 'tags':
 const tagMatches = sectionContent.match(/#[\u4e00-\u9fa5a-zA-Z0-9_]+/g) || [];
 const listTagMatches = sectionContent.match(/[-*]\s*([^\n]+)/g) || [];
 const extractedTags = [
 ...tagMatches.map(tag => tag.replace(/^#/, '')), // 移除#号
 ...listTagMatches.map(item => item.replace(/[-*]\s*/, '').trim())
 ];
 tags = Array.from(new Set(extractedTags)).filter(Boolean); // 去重并移除空字符串
 break;
 case 'imagePrompt':
 imagePrompt = sectionContent;
 break;
 case 'selfComment':
 selfComment = sectionContent;
 break;
 case 'strategy':
 strategy = sectionContent;
 break;
 case 'playbook':
 playbook = sectionContent;
 break;
 }
 }

 return { titles, body, tags, imagePrompt, selfComment, strategy, playbook };
 }, []);

 // 实时解析显示内容并更新状态 - 使用节流优化性能
 useEffect(() => {
 if (!displayContent) return;

 // 使用 requestAnimationFrame 优化渲染性能
 const timeoutId = setTimeout(() => {
 const parsed = parseContent(displayContent);
 setGeneratedContent(parsed);
 }, 100); // 100ms 节流，避免过于频繁的解析

 return () => clearTimeout(timeoutId);
 }, [displayContent, parseContent]);

 const hasParsedContent = Boolean(
 generatedContent.titles.trim() ||
 generatedContent.body.trim() ||
 generatedContent.tags.length > 0 ||
 generatedContent.imagePrompt.trim() ||
 generatedContent.selfComment.trim() ||
 generatedContent.strategy.trim() ||
 generatedContent.playbook.trim()
 );

 const buildFullCopyText = useCallback(() => {
 const sections: string[] = [];

 if (generatedContent.titles.trim()) {
 sections.push(`【爆款标题】\n${generatedContent.titles.trim()}`);
 }
 if (generatedContent.body.trim()) {
 sections.push(`【正文内容】\n${generatedContent.body.trim()}`);
 }
 if (generatedContent.tags.length > 0) {
 sections.push(`【关键词标签】\n${generatedContent.tags.map(tag => `#${tag}`).join(' ')}`);
 }
 if (generatedContent.imagePrompt.trim()) {
 sections.push(`【绘画提示词】\n${generatedContent.imagePrompt.trim()}`);
 }
 if (generatedContent.selfComment.trim()) {
 sections.push(`【首评建议】\n${generatedContent.selfComment.trim()}`);
 }
 if (generatedContent.strategy.trim()) {
 sections.push(`【发布策略】\n${generatedContent.strategy.trim()}`);
 }
 if (generatedContent.playbook.trim()) {
 sections.push(`【增长 Playbook】\n${generatedContent.playbook.trim()}`);
 }

 const normalized = sections.join('\n\n');
 return normalized || displayContent.trim();
 }, [displayContent, generatedContent]);

 // 通用的、带反馈的复制处理函数
 const handleCopy = async (textToCopy: string | undefined, buttonId: string) => {
 if (!textToCopy) return;

 try {
 await navigator.clipboard.writeText(textToCopy);
 } catch (copyError) {
 console.error('复制失败:', copyError);
 return;
 }

 // 清除上一个计时器（如果存在）
 if (copyTimeoutRef.current) {
 clearTimeout(copyTimeoutRef.current);
 }

 setCopiedButtonId(buttonId);

 // 2秒后自动恢复按钮状态
 copyTimeoutRef.current = setTimeout(() => {
 setCopiedButtonId(null);
 }, 2000);
 };

 // 滚动检测，显示回到顶部按钮
 useEffect(() => {
 const handleScroll = () => {
 setShowScrollTop(window.scrollY > 300);
 };

 window.addEventListener('scroll', handleScroll);
 return () => window.removeEventListener('scroll', handleScroll);
 }, []);

 // 回到顶部函数
 const scrollToTop = () => {
 window.scrollTo({ top: 0, behavior: 'smooth' });
 };

 // 开始生成的函数
 const startGeneration = async () => {
 const keyword = searchParams.get('keyword');
 const userInfo = searchParams.get('userInfo');
 let currentGeneration = 0;

 if (!keyword || !userInfo) {
 setError('缺少必要的参数');
 setLoading(false);
 return;
 }

 try {
 // 标记开始生成
 currentGeneration = ++generationSequenceRef.current;
 const isCurrentGeneration = () =>
 generationSequenceRef.current === currentGeneration && !abortControllerRef.current?.signal.aborted;

 setHasGenerated(true);
 setLoading(true);
 setError(null);

 // 立即开始生成流程，不等待
 setLoadingStage('fetching-data');
 setDisplayContent('');
 setGeneratedContent({ ...EMPTY_GENERATED_CONTENT });

 // 确保之前的 AbortController 被清理
 if (abortControllerRef.current) {
 abortControllerRef.current.abort();
 }

 // 创建新的 AbortController
 abortControllerRef.current = new AbortController();
 const currentController = abortControllerRef.current;

 try {
 setLoadingStage('analyzing-trends');

 const streamResponse = await fetch('/api/generate-combined', {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 },
 body: JSON.stringify({
 user_info: userInfo,
 keyword,
 }),
 signal: currentController.signal,
 });

 // 检查请求是否被中止
 if (currentController.signal.aborted) {
 console.log('请求被中止');
 return;
 }

 if (!streamResponse.ok) {
 throw new Error(`生成内容失败: HTTP ${streamResponse.status}`);
 }

 setLoadingStage('generating-content');

 const reader = streamResponse.body?.getReader();
 const decoder = new TextDecoder();
 let streamBuffer = '';

 if (!reader) {
 throw new Error('服务端未返回可读取的流');
 }

 const handleStreamData = (rawData: string) => {
 if (!isCurrentGeneration()) return false;
 if (rawData === '[DONE]') {
 setLoading(false);
 setLoadingStage('');
 return true;
 }

 let parsed;
 try {
 parsed = JSON.parse(rawData);
 } catch (parseError) {
 console.warn('JSON 解析错误:', parseError);
 return false;
 }

 if (parsed.content) {
 setDisplayContent(prev => prev + parsed.content);
 } else if (parsed.error) {
 throw new Error(parsed.error);
 }
 return false;
 };

 try {
 while (true) {
 // 检查是否被中止
 if (currentController.signal.aborted) {
 console.log('读取被中止');
 break;
 }

 const { done, value } = await reader.read();
 if (done) break;

 streamBuffer += decoder.decode(value, { stream: true });
 const lines = streamBuffer.split('\n');
 streamBuffer = lines.pop() ?? '';

 for (const rawLine of lines) {
 const line = rawLine.trim();
 if (!line.startsWith('data:')) continue;
 const data = line.slice(5).trim();
 if (!data) continue;
 if (handleStreamData(data)) {
 return;
 }
 }
 }

 const tailLine = streamBuffer.trim();
 if (tailLine.startsWith('data:')) {
 const data = tailLine.slice(5).trim();
 if (data) {
 handleStreamData(data);
 }
 }
 } finally {
 reader.releaseLock();
 if (isCurrentGeneration()) {
 setLoading(false);
 setLoadingStage('');
 }
 }
 } catch (fetchError) {
 // 检查是否是中止错误
 if (fetchError instanceof Error && fetchError.name === 'AbortError') {
 console.log('请求被主动中止');
 return;
 }
 throw fetchError;
 }
 } catch (err) {
 console.error('生成失败:', err);

 // 提供更详细的错误信息
 let errorMessage = '生成失败，请重试';
 if (err instanceof Error) {
 if (err.message.includes('fetch')) {
 errorMessage = '网络连接失败，请检查网络后重试';
 } else if (err.message.includes('timeout')) {
 errorMessage = '请求超时，请重试';
 } else {
 errorMessage = err.message;
 }
 }

 if (currentGeneration === generationSequenceRef.current) {
 setError(errorMessage);
 setLoading(false);
 setLoadingStage('');
 }
 }
 };

 // 保持 ref 始终指向最新的 startGeneration
 startGenerationRef.current = startGeneration;

 // 从URL参数中获取数据并判断是否需要生成
 useEffect(() => {
 const checkAndStart = async () => {
 try {
 // 检查是否有已生成的数据（来自旧的跳转方式）
 const data = searchParams.get('data');
 if (data) {
 // 处理已生成的数据
 const decodedData = decodeURIComponent(atob(data));
 const parsed = parseContent(decodedData);
 setDisplayContent(decodedData);
 setGeneratedContent(parsed);
 setLoading(false);
 setHasGenerated(true);
 return;
 }

 // 获取新的参数（keyword和userInfo）
 const keyword = searchParams.get('keyword');
 const userInfo = searchParams.get('userInfo');

 if (!keyword || !userInfo) {
 setError('缺少必要的参数');
 setLoading(false);
 return;
 }

 // 检查是否是页面刷新的情况
 const sessionKey = `generated_${keyword}_${userInfo}`;
 const hasGeneratedInSession = sessionStorage.getItem(sessionKey);

 if (hasGeneratedInSession && !hasGenerated) {
 // 页面刷新的情况，显示重新生成提示
 setLoading(false);
 setShowRegeneratePrompt(true);
 return;
 }

 // 如果还没有生成过，开始生成
 if (!hasGenerated) {
 // 标记这个会话已经生成过
 sessionStorage.setItem(sessionKey, 'true');
 await startGenerationRef.current?.();
 }
 } catch (err) {
 console.error('初始化失败:', err);
 setError('初始化失败');
 setLoading(false);
 }
 };

 checkAndStart();
 }, [searchParams, parseContent, hasGenerated]);

 // 清理函数
 useEffect(() => {
 return () => {
 // 清理 AbortController
 if (abortControllerRef.current) {
 abortControllerRef.current.abort();
 abortControllerRef.current = null;
 }
 // 失效当前生成序列，避免异步回调污染状态
 generationSequenceRef.current += 1;
 if (copyTimeoutRef.current) {
 clearTimeout(copyTimeoutRef.current);
 }
 };
 }, []);


 if (showRegeneratePrompt) {
 return (
 <div className="min-h-[80vh] flex flex-col justify-center items-center">
 <Card className="glass-panel w-full max-w-sm mx-4 animate-scale-in border-border shadow-md">
 <CardContent className="text-center py-10 px-6">
 <RefreshCw className="w-8 h-8 mx-auto text-primary mb-5" />
 <h3 className="text-lg font-semibold text-foreground mb-3">存在会话数据</h3>
 <p className="text-sm text-muted-foreground mb-8">
 系统检测到您目前已有生成过的数据缓冲。是否重新执行引擎并生成全新内容？
 </p>
 <div className="flex flex-col gap-3">
 <Button
 onClick={async () => {
 setShowRegeneratePrompt(false);
 await startGenerationRef.current?.();
 }}
 className="w-full bg-foreground text-background font-semibold hover:bg-foreground/90 transition-colors"
 size="lg"
 >
 生成全新内容
 </Button>
 <Button variant="outline" className="w-full" size="lg" onClick={() => router.push('/')}>
 返回配置页
 </Button>
 </div>
 </CardContent>
 </Card>
 </div>
 );
 }

 if (loading && !hasParsedContent) {
 const loadingStages = {
 'preparing': '引擎预热中...',
 'fetching-data': '获取全网高传播量特征参数...',
 'analyzing-trends': '底层吸引力解析建模...',
 'generating-content': 'LLM 流式写入文本中...'
 };

 const currentText = loadingStages[loadingStage as keyof typeof loadingStages] || loadingStages.preparing;

 return (
 <div className="min-h-[70vh] flex flex-col items-center justify-center bg-transparent">
 <div className="w-full max-w-sm px-6 py-10 glass-panel rounded-xl flex flex-col items-center animate-fade-in shadow-md border-border">
 <Loader2 className="w-8 h-8 text-primary animate-spin mb-6" />
 <h3 className="text-base font-semibold tracking-tight mb-2">架构重塑进行中</h3>
 <p className="text-sm text-muted-foreground font-mono bg-muted/50 px-3 py-1 rounded inline-block">
 <span className="inline-block w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse mr-2 mb-[1px]" />
 {currentText}
 </p>

 <div className="w-full mt-8 bg-secondary h-1.5 rounded-full overflow-hidden relative">
 <div className="absolute top-0 left-0 h-full bg-foreground animate-shimmer" style={{ width: '40%' }}></div>
 </div>
 </div>
 </div>
 );
 }

 if (error) {
 return (
 <div className="min-h-[70vh] flex flex-col items-center justify-center bg-transparent">
 <Card className="glass-panel w-full max-w-sm mx-4 animate-fade-in border-destructive/20 shadow-md">
 <CardContent className="text-center py-10 px-6">
 <AlertTriangle className="w-10 h-10 mx-auto text-destructive mb-4" />
 <h3 className="text-lg font-bold text-foreground mb-2">系统执行错误</h3>
 <p className="text-destructive/80 text-sm mb-6 pb-4 border-b border-border/50 break-words">{error}</p>
 <Button
 onClick={() => router.push('/')}
 className="w-full bg-foreground text-background font-semibold"
 >
 返回并修复参数
 </Button>
 </CardContent>
 </Card>
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-transparent relative overflow-hidden pb-12">
 <BackgroundDecorations />

 <div className="relative z-10 container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
 <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8">

 {/* 返回按钮和快速导航 */}
 <div className="flex justify-between items-center mb-6">
 <Button
 onClick={() => router.push('/')}
 variant="outline"
 className="flex items-center gap-2 border-2 border-border hover:border-primary/50 transition-all duration-300"
 >
 <ArrowLeft size={16} />
 返回首页
 </Button>

 {/* 快速导航 - 桌面端和移动端不同样式 */}
 {!loading && (
 <>
 {/* 桌面端导航 */}
 <div className="hidden lg:flex items-center gap-2 bg-card/80 backdrop-blur-sm rounded-xl px-4 py-2 border border-border/50 shadow-lg">
 <span className="text-sm text-muted-foreground font-medium">快速跳转：</span>
 <div className="flex gap-2">
 {generatedContent.titles && (
 <button
 onClick={() => document.getElementById('titles-section')?.scrollIntoView({ behavior: 'smooth' })}
 className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
 >
 标题
 </button>
 )}
 {generatedContent.body && (
 <button
 onClick={() => document.getElementById('body-section')?.scrollIntoView({ behavior: 'smooth' })}
 className="px-2 py-1 text-xs bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-colors"
 >
 正文
 </button>
 )}
 {generatedContent.tags.length > 0 && (
 <button
 onClick={() => document.getElementById('tags-section')?.scrollIntoView({ behavior: 'smooth' })}
 className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
 >
 标签
 </button>
 )}
 </div>
 </div>

 {/* 移动端导航 - 简化版本 */}
 <div className="lg:hidden flex items-center gap-1">
 {generatedContent.titles && (
 <button
 onClick={() => document.getElementById('titles-section')?.scrollIntoView({ behavior: 'smooth' })}
 className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
 >
 标题
 </button>
 )}
 {generatedContent.body && (
 <button
 onClick={() => document.getElementById('body-section')?.scrollIntoView({ behavior: 'smooth' })}
 className="px-2 py-1 text-xs bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-colors"
 >
 正文
 </button>
 )}
 {generatedContent.tags.length > 0 && (
 <button
 onClick={() => document.getElementById('tags-section')?.scrollIntoView({ behavior: 'smooth' })}
 className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
 >
 标签
 </button>
 )}
 </div>
 </>
 )}
 </div>

 {/* 加载状态卡片 - 流式生成过程中持续显示 */}
 {loading && (
 <Card className="animate-slide-up glass-panel shadow-sm border-border bg-card shadow-lg overflow-hidden bg-card border border-blue-200/30">

 <CardContent className="text-center py-12 sm:py-16 px-4 sm:px-6 relative overflow-hidden">
 <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 mb-4 sm:mb-6 bg-card text-foreground rounded-full shadow-lg animate-spin-slow">
 <div className="w-12 h-12 sm:w-16 sm:h-16 bg-card rounded-full flex items-center justify-center">
 <span className="text-xl sm:text-2xl animate-fade-in">✨</span>
 </div>
 </div>
 <div className="space-y-2 sm:space-y-3">
 <h3 className="text-lg sm:text-xl font-bold text-foreground animate-pulse">
 AI 正在流式创作中...
 </h3>
 <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
 新内容会持续写入下方卡片，等待完成即可一键复制。
 </p>
 </div>
 </CardContent>
 </Card>
 )}

 {/* 生成完成总览卡片 - 仅在生成完成后显示 */}
 {!loading && generatedContent.titles && (
 <Card className="animate-slide-up glass-panel shadow-sm border-border bg-card shadow-lg overflow-hidden bg-card border border-green-200/30">

 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-4 sm:px-6 lg:px-8 pt-6">
 <div className="flex-1">
 <CardTitle className="flex items-center gap-2 text-lg sm:text-xl lg:text-2xl">
 <span className="text-xl sm:text-2xl lg:text-3xl animate-pulse">🎉</span>
 <span className="text-foreground font-bold">
 生成完成
 </span>
 <Badge variant="tag" className="ml-2 text-green-700 font-semibold border-0 animate-scale-in">
 已完成
 </Badge>
 </CardTitle>
 <CardDescription className="text-sm sm:text-base lg:text-lg text-muted-foreground mt-1">
 AI 已完成内容创作，点击各部分可单独复制或复制全文
 </CardDescription>
 </div>
 <Button
 onClick={() => handleCopy(buildFullCopyText(), 'full')}
 variant="outline"
 size="sm"
 className="ml-4 w-[110px] sm:w-[130px] text-xs sm:text-sm font-medium shadow-lg hover:shadow-md transition-all duration-300"
 >
 {copiedButtonId === 'full' ? (
 <span className="flex items-center gap-2 text-green-600">
 <Check size={16} className="animate-scale-in" />
 已复制
 </span>
 ) : (
 <span className="flex items-center gap-2">
 <Clipboard size={16} />
 复制全文
 </span>
 )}
 </Button>
 </CardHeader>
 </Card>
 )}

 {/* 概览与数据 */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
 <Card className="glass-panel shadow-sm border-border bg-card shadow-lg bg-card border border-blue-200/30 dark:border-blue-700/30">
 <CardContent className="p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
 <div className="p-2 sm:p-3 bg-muted/50 rounded-xl sm:rounded-2xl text-white shadow-sm rotate-3 transition-transform hover:rotate-6">
 <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
 </div>
 <div>
 <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">总字数预估</p>
 <p className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">~800字</p>
 </div>
 </CardContent>
 </Card>
 <Card className="glass-panel shadow-sm border-border bg-card shadow-lg bg-card border border-indigo-200/30 dark:border-indigo-700/30">
 <CardContent className="p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
 <div className="p-2 sm:p-3 bg-muted/50 rounded-xl sm:rounded-2xl text-white shadow-sm -rotate-3 transition-transform hover:-rotate-6">
 <Tags className="w-5 h-5 sm:w-6 sm:h-6" />
 </div>
 <div>
 <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">包含标签数</p>
 <p className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">{generatedContent.tags.length || 0}个</p>
 </div>
 </CardContent>
 </Card>
 <Card className="glass-panel shadow-sm border-border bg-card shadow-lg bg-card border border-purple-200/30 dark:border-purple-700/30">
 <CardContent className="p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
 <div className="p-2 sm:p-3 bg-muted/50 rounded-xl sm:rounded-2xl text-white shadow-sm rotate-3 transition-transform hover:rotate-6">
 <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
 </div>
 <div>
 <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">创意指数</p>
 <p className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">98%</p>
 </div>
 </CardContent>
 </Card>
 <Card className="glass-panel shadow-sm border-border bg-card shadow-lg bg-card border border-pink-200/30 dark:border-pink-700/30">
 <CardContent className="p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
 <div className="p-2 sm:p-3 bg-muted/50 rounded-xl sm:rounded-2xl text-white shadow-sm -rotate-3 transition-transform hover:-rotate-6">
 <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
 </div>
 <div>
 <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">爆款潜力</p>
 <p className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">极高</p>
 </div>
 </CardContent>
 </Card>
 </div>

 {/* 各个分段的卡片 - 根据内容实时显示 */}
 {/* 标题卡片 - 当有标题内容时就显示 */}
 {generatedContent.titles && (
 <>
 <div className="flex items-center justify-center my-6 sm:my-8 opacity-80">
 <div className="h-[1px] w-12 sm:w-24 bg-foreground text-background "></div>
 <div className="px-3 sm:px-4 text-xs sm:text-sm text-blue-600/60 dark:text-blue-400/60 font-medium uppercase tracking-widest">Contents</div>
 <div className="h-[1px] w-12 sm:w-24 bg-gradient-to-l from-transparent to-blue-400 "></div>
 </div>

 <Card id="titles-section" className="animate-slide-up glass-panel shadow-sm border-border bg-card shadow-lg overflow-hidden bg-card border border-indigo-200/30 dark:border-indigo-700/30">

 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-4 sm:px-6 lg:px-8 pt-6 relative">
 <div className="flex-1">
 <CardTitle className="flex items-center gap-2 text-lg sm:text-xl lg:text-2xl">
 <PartyPopper className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500 animate-pulse" />
 <span className="text-foreground font-bold">
 爆款标题
 </span>
 <Badge variant="tag" className="ml-2 text-indigo-700 font-semibold dark:text-indigo-300 border-0 animate-scale-in">
 {loading ? '生成中...' : '优选'}
 </Badge>
 </CardTitle>
 <CardDescription className="text-sm sm:text-base lg:text-lg text-slate-600 dark:text-slate-400 mt-1">
 吸睛标题是获取流量的第一步
 </CardDescription>
 </div>
 <Button
 onClick={() => handleCopy(generatedContent.titles, 'titles')}
 variant="outline"
 size="sm"
 className="ml-4 w-[110px] sm:w-[130px] text-xs sm:text-sm font-medium shadow-lg hover:shadow-md transition-all duration-300 z-10"
 >
 {copiedButtonId === 'titles' ? (
 <span className="flex items-center gap-2 text-green-600 dark:text-green-400">
 <Check size={16} className="animate-scale-in" />
 已复制
 </span>
 ) : (
 <span className="flex items-center gap-2">
 <Clipboard size={16} />
 复制标题
 </span>
 )}
 </Button>
 </CardHeader>
 <CardContent className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8">
 <div className="prose prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 leading-relaxed p-4 sm:p-6 bg-card rounded-2xl border-2 border-blue-200/40 dark:border-blue-700/30 shadow-inner backdrop-blur-sm">
 <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
 p: ({ children }) => <div className="mb-2">{children}</div>,
 div: ({ children }) => <div className="mb-2">{children}</div>
 }}>
 {generatedContent.titles}
 </ReactMarkdown>
 </div>
 </CardContent>
 </Card>
 </>
 )}

 {/* 内容卡片 - 当有正文内容时就显示 */}
 {generatedContent.body && (
 <Card id="body-section" className="animate-slide-up glass-panel shadow-sm border-border bg-card shadow-lg overflow-hidden bg-card border border-blue-200/30 dark:border-blue-700/30">

 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-4 sm:px-6 lg:px-8 pt-6 relative">
 <div className="flex-1">
 <CardTitle className="flex items-center gap-2 text-lg sm:text-xl lg:text-2xl">
 <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 animate-pulse" />
 <span className="text-foreground font-bold">
 生成内容
 </span>
 <Badge variant="tag" className="ml-2 text-blue-700 font-semibold dark:text-blue-300 border-0 animate-scale-in">
 {loading ? '生成中...' : '已完成'}
 </Badge>
 </CardTitle>
 <CardDescription className="text-sm sm:text-base lg:text-lg text-slate-600 dark:text-slate-400 mt-1">
 AI生成的精彩正文内容
 </CardDescription>
 </div>
 <Button
 onClick={() => handleCopy(generatedContent.body, 'body')}
 variant="outline"
 size="sm"
 className="ml-4 w-[110px] sm:w-[130px] text-xs sm:text-sm font-medium shadow-lg hover:shadow-md transition-all duration-300 z-10"
 >
 {copiedButtonId === 'body' ? (
 <span className="flex items-center gap-2 text-green-600 dark:text-green-400">
 <Check size={16} className="animate-scale-in" />
 已复制
 </span>
 ) : (
 <span className="flex items-center gap-2">
 <Clipboard size={16} />
 复制正文
 </span>
 )}
 </Button>
 </CardHeader>
 <CardContent className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8">
 <div className="prose prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 leading-relaxed p-4 sm:p-6 bg-card rounded-2xl border-2 border-blue-200/40 dark:border-blue-700/30 shadow-inner backdrop-blur-sm">
 <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
 p: ({ children }) => <div className="mb-2">{children}</div>,
 div: ({ children }) => <div className="mb-2">{children}</div>,
 // 确保其他可能产生块级元素的标签也正确处理
 h1: ({ children }) => <h1 className="mb-2 text-xl font-bold">{children}</h1>,
 h2: ({ children }) => <h2 className="mb-2 text-lg font-bold">{children}</h2>,
 h3: ({ children }) => <h3 className="mb-2 text-md font-bold">{children}</h3>,
 ul: ({ children }) => <ul className="mb-2 list-disc list-inside">{children}</ul>,
 ol: ({ children }) => <ol className="mb-2 list-decimal list-inside">{children}</ol>,
 li: ({ children }) => <li className="mb-1">{children}</li>
 }}>
 {generatedContent.body}
 </ReactMarkdown>
 </div>
 </CardContent>
 </Card>
 )}

 {/* 绘画提示词卡片 */}
 {generatedContent.imagePrompt && (
 <Card id="prompts-section" className="animate-slide-up glass-panel shadow-sm border-border bg-card shadow-md bg-card border border-purple-200/30 dark:border-purple-700/30">
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-4 sm:px-6 lg:px-8 pt-6 relative">
 <div className="flex-1">
 <CardTitle className="flex items-center gap-2 text-lg sm:text-xl lg:text-2xl">
 <ImagePlus className="w-5 h-5 sm:w-7 sm:h-7 text-purple-500 animate-pulse" />
 <span className="text-foreground font-bold">
 Midjourney / DALL-E 绘画指令
 </span>
 </CardTitle>
 <CardDescription className="text-sm sm:text-base lg:text-lg text-slate-600 dark:text-slate-400 mt-1">
 优质配图是小红书爆款的灵魂（可以直接复制到AI绘画工具中使用）
 </CardDescription>
 </div>
 <Button
 onClick={() => handleCopy(generatedContent.imagePrompt, 'prompts')}
 variant="outline"
 size="sm"
 className="ml-4 w-[110px] sm:w-[130px] text-xs sm:text-sm font-medium shadow-lg hover:shadow-md transition-all duration-300 z-10"
 >
 {copiedButtonId === 'prompts' ? (
 <span className="flex items-center gap-2 text-green-600 dark:text-green-400">
 <Check size={16} className="animate-scale-in" />
 已复制全部
 </span>
 ) : (
 <span className="flex items-center gap-2">
 <Clipboard size={16} />
 复制全部指令
 </span>
 )}
 </Button>
 </CardHeader>
 <CardContent className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8">
 <div className="space-y-3 sm:space-y-4">
 {generatedContent.imagePrompt.split('\n\n').filter(Boolean).map((prompt: string, index: number) => (
 <div key={index} className="group relative bg-white/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 rounded-xl border border-purple-200/40 dark:border-purple-700/40 shadow-sm hover:shadow-md transition-all duration-300 p-3 sm:p-4 pl-10 sm:pl-12">
 <div className="absolute left-3 sm:left-4 top-3.5 sm:top-4.5 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-muted/50 text-white flex items-center justify-center text-xs font-bold shadow-sm">
 {index + 1}
 </div>
 <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium pr-8 sm:pr-10">{prompt}</p>

 <button
 onClick={() => handleCopy(prompt, `prompt-${index}`)}
 className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 text-purple-400 dark:text-purple-500 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
 title="复制此提示词"
 >
 {copiedButtonId === `prompt-${index}` ? <Check size={16} className="text-green-500" /> : <Clipboard size={16} />}
 </button>
 </div>
 ))}
 </div>
 </CardContent>
 </Card>
 )}

 {/* 首评卡片 */}
 {generatedContent.selfComment && (
 <Card id="comment-section" className="animate-slide-up glass-panel shadow-sm border-border bg-card shadow-md bg-card border border-rose-200/30 dark:border-rose-700/30">
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-4 sm:px-6 lg:px-8 pt-6 relative">
 <div className="flex-1">
 <CardTitle className="flex items-center gap-2 text-lg sm:text-xl lg:text-2xl">
 <MessageCircle className="w-5 h-5 sm:w-7 sm:h-7 text-rose-500 animate-pulse" />
 <span className="text-foreground font-bold">
 引导互动首评
 </span>
 </CardTitle>
 </div>
 <Button
 onClick={() => handleCopy(generatedContent.selfComment, 'comment')}
 variant="outline"
 size="sm"
 className="ml-4 w-[110px] sm:w-[130px] text-xs sm:text-sm font-medium shadow-lg hover:shadow-md transition-all duration-300 z-10"
 >
 {copiedButtonId === 'comment' ? (
 <span className="flex items-center gap-2 text-green-600 dark:text-green-400">
 <Check size={16} className="animate-scale-in" />
 已复制
 </span>
 ) : (
 <span className="flex items-center gap-2">
 <Clipboard size={16} />
 复制评论
 </span>
 )}
 </Button>
 </CardHeader>
 <CardContent className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8">
 <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-4 sm:p-5 border border-rose-200/50 dark:border-rose-800/50 shadow-sm relative overflow-hidden group">
 <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-rose-400 to-orange-500"></div>
 <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed font-medium pl-3">{generatedContent.selfComment}</p>
 </div>
 <div className="mt-3 sm:mt-4 p-3 bg-rose-100/40 dark:bg-rose-900/20 rounded-lg border border-rose-200/50 dark:border-rose-800/30 text-xs sm:text-sm text-rose-700 dark:text-rose-400 font-medium flex items-center gap-2">
 <Lightbulb className="w-4 h-4 shrink-0" /> 自己发布后第一时间在评论区发这条评论，并顶置，能提升至少30%的互动率。
 </div>
 </CardContent>
 </Card>
 )}

 {/* 关键词标签卡片 */}
 {generatedContent.tags && generatedContent.tags.length > 0 && (
 <Card id="tags-section" className="animate-slide-up glass-panel shadow-sm border-border bg-card shadow-md bg-card border border-indigo-200/30 dark:border-indigo-700/30">
 <CardHeader className="pb-3 px-4 sm:px-6 lg:px-8 pt-6">
 <CardTitle className="flex items-center gap-2 text-lg sm:text-xl lg:text-2xl">
 <Tags className="w-5 h-5 sm:w-7 sm:h-7 text-indigo-500 animate-pulse" />
 <span className="text-foreground font-bold">
 高转化话题标签
 </span>
 </CardTitle>
 </CardHeader>
 <CardContent className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8">
 <div className="flex flex-wrap gap-2 sm:gap-3">
 {generatedContent.tags.map((tag: string, index: number) => (
 <Badge
 key={index}
 variant="tag"
 className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium bg-white/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-indigo-100 border border-indigo-200/50 dark:border-indigo-700/50 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
 style={{ animationDelay: `${index * 0.05}s` }}
 >
 #{tag}
 </Badge>
 ))}
 </div>
 <div className="mt-4 sm:mt-5 p-3 sm:p-4 bg-indigo-100/40 dark:bg-indigo-900/20 rounded-xl border border-indigo-200/30 dark:border-indigo-800/30">
 <div className="flex items-start gap-2">
 <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500 mt-0.5 shrink-0" />
 <p className="text-xs sm:text-sm text-indigo-700 dark:text-indigo-300 leading-relaxed font-medium">
 建议将前3-5个最相关的标签放在正文末尾，其他标签可以放在评论区首评，既能增加系统收录概率，又不会让正文显得杂乱。
 </p>
 </div>
 </div>
 </CardContent>
 </Card>
 )}

 {/* 发布策略建议卡片 - 当有策略时就显示 */}
 {generatedContent.strategy && (
 <Card className="animate-slide-up glass-panel shadow-sm border-border bg-card shadow-md bg-card border border-slate-200/50 dark:border-slate-700/50">
 <CardHeader className="pb-3 px-4 sm:px-6 lg:px-8 pt-6">
 <CardTitle className="flex items-center gap-2 text-lg sm:text-xl lg:text-2xl">
 <Calendar className="w-5 h-5 sm:w-7 sm:h-7 text-blue-500 animate-pulse" />
 <span className="text-foreground font-bold">发布策略建议</span>
 </CardTitle>
 </CardHeader>
 <CardContent className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8">
 <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-4 sm:p-5 border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
 <h4 className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200 mb-2 sm:mb-3 text-sm sm:text-base">
 <div className="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 p-1.5 rounded-lg">
 <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
 </div>
 发布时机与执行建议
 </h4>
 <div className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed font-medium">
 <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
 p: ({ children }) => <div className="mb-2">{children}</div>,
 div: ({ children }) => <div className="mb-2">{children}</div>
 }}>
 {generatedContent.strategy}
 </ReactMarkdown>
 </div>
 </div>
 </CardContent>
 </Card>
 )}

 {/* 小红书爆款增长 Playbook */}
 <div className="mt-8 sm:mt-12 mb-20 sm:mb-24 animate-slide-up" style={{ animationDelay: '0.3s' }}>
 <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 px-2">
 <Rocket className="w-6 h-6 sm:w-8 sm:h-8 text-slate-700 dark:text-slate-300" />
 <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">小红书爆款增长 Playbook</h3>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
 <Card className="glass-panel shadow-sm border-border bg-card border-0 shadow-lg bg-muted/50 ">
 <CardContent className="p-4 sm:p-5 lg:p-6">
 <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-900/50 rounded-xl sm:rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-3 sm:mb-4">
 <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
 </div>
 <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1.5 sm:mb-2 text-sm sm:text-base">流量黄金前1小时</h4>
 <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">发布后第一时间转发到微信粉丝群，邀请好友点赞评论。系统初期会根据首波数据决定是否推入下一个流量池。</p>
 </CardContent>
 </Card>

 <Card className="glass-panel shadow-sm border-border bg-card border-0 shadow-lg bg-muted/50 ">
 <CardContent className="p-4 sm:p-5 lg:p-6">
 <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl sm:rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3 sm:mb-4">
 <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
 </div>
 <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1.5 sm:mb-2 text-sm sm:text-base">神评论制造机</h4>
 <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">用小号在评论区留下有争议性或有共鸣的评论，引导路人参与讨论。互动率&gt;5%是成为爆款的关键及格线。</p>
 </CardContent>
 </Card>

 <Card className="glass-panel shadow-sm border-border bg-card border-0 shadow-lg bg-muted/50 sm:col-span-2 md:col-span-2 lg:col-span-1">
 <CardContent className="p-4 sm:p-5 lg:p-6">
 <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 dark:bg-purple-900/50 rounded-xl sm:rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400 mb-3 sm:mb-4">
 <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6" />
 </div>
 <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1.5 sm:mb-2 text-sm sm:text-base">长尾流量收割</h4>
 <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">如果内容在48小时后还在涨粉，应立即在评论区置顶相关的引流/带货信息；或者发布"续集"留住持续关注的热度。</p>
 </CardContent>
 </Card>
 </div>
 </div>

 {/* 增长Playbook卡片 - 当有playbook时就显示 */}
 {generatedContent.playbook && (
 <Card className="animate-slide-up glass-panel shadow-sm border-border bg-card shadow-md bg-card border border-indigo-200/30 dark:border-indigo-700/30">
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-4 sm:px-6 lg:px-8 pt-6">
 <div className="flex-1">
 <CardTitle className="flex items-center gap-2 text-lg sm:text-xl lg:text-2xl">
 <TrendingUp className="w-5 h-5 sm:w-7 sm:h-7 text-indigo-500 animate-pulse" />
 <span className="text-foreground font-bold">互动增长建议</span>
 </CardTitle>
 <CardDescription className="text-sm sm:text-base lg:text-lg text-slate-600 dark:text-slate-400 mt-1">提升赞藏评数据的实操建议</CardDescription>
 </div>
 </CardHeader>
 <CardContent className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8">
 <div className="prose prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 leading-relaxed p-4 sm:p-6 bg-card rounded-2xl border-2 border-indigo-200/40 dark:border-indigo-700/30 shadow-inner backdrop-blur-sm">
 <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
 p: ({ children }) => <div className="mb-2">{children}</div>,
 div: ({ children }) => <div className="mb-2">{children}</div>
 }}>
 {generatedContent.playbook}
 </ReactMarkdown>
 </div>
 </CardContent>
 </Card>
 )}

 {/* 操作按钮 */}
 <Card className="glass-panel shadow-sm border-border bg-card shadow-lg animate-fade-in bg-card border border-blue-200/30">

 <CardContent className="px-4 sm:px-6 lg:px-8 py-6">
 <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center justify-between">
 <div className="flex items-center gap-2 text-sm text-muted-foreground">
 <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
 <span>{loading ? '内容仍在生成中，可提前复制已生成部分。' : '生成完成，可以复制使用了！'}</span>
 </div>
 <div className="flex gap-2 sm:gap-3 flex-wrap justify-center sm:justify-end">
 <Button
 onClick={() => handleCopy(buildFullCopyText(), 'full')}
 variant="modern"
 size="sm"
 className="shadow-lg hover:shadow-md transition-all duration-300"
 >
 {copiedButtonId === 'full' ? (
 <span className="flex items-center gap-2 text-white">
 <Check size={16} className="animate-scale-in" />
 已复制全文
 </span>
 ) : (
 <span className="flex items-center gap-2">
 <Clipboard size={16} />
 复制全文
 </span>
 )}
 </Button>
 <Button
 onClick={() => router.push('/')}
 variant="outline"
 size="sm"
 className="border-2 border-border hover:border-primary/50 hover:bg-accent transition-all duration-300 shadow-lg hover:shadow-md"
 >
 <span className="flex items-center gap-2">
 <ArrowLeft size={16} />
 返回首页
 </span>
 </Button>
 </div>
 </div>
 </CardContent>
 </Card>
 </div>

 {/* 回到顶部按钮 */}
 {showScrollTop && (
 <button
 onClick={scrollToTop}
 className="fixed bottom-6 right-6 w-12 h-12 text-white font-semibold rounded-full shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center z-50 animate-fade-in hover:scale-110"
 >
 <ArrowUp size={20} />
 </button>
 )}
 </div>
 </div>
 );
}

// Loading component for Suspense fallback
function GeneratePageLoading() {
 return (
 <div className="min-h-screen bg-card flex items-center justify-center">
 <div className="text-center">
 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
 <p className="text-muted-foreground">正在加载生成结果...</p>
 </div>
 </div>
 )
}

export default function GeneratePage() {
 return (
 <Suspense fallback={<GeneratePageLoading />}>
 <GeneratePageContent />
 </Suspense>
 )
}
