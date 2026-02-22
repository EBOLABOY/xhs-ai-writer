'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatErrorForUser } from '@/lib/error-handler'
import { FormData, ErrorState } from '@/lib/types'
import { Sparkles, Target, FileText, Loader2, AlertTriangle } from 'lucide-react'

// Constants
const UI_CONFIG = {
  title: 'AI 智能文案工厂',
  version: 'v2.0',
  description: '基于先进AI模型 · 实时智能分析 · 一键生成爆款内容',
  placeholders: {
    keyword: '例如：护肤心得、美食探店、旅行攻略...',
    userInfo: '产品特点、个人感受、具体细节...越详细生成的文案越精准👍'
  },
  buttonText: '开始生成爆款文案'
} as const;

// UI Components
function BackgroundDecorations() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-32 -right-32 w-64 h-64 bg-gradient-to-br from-blue-200/30 to-indigo-200/30 dark:from-blue-600/10 dark:to-indigo-500/10 rounded-full blur-3xl animate-float mix-blend-multiply dark:mix-blend-screen transition-colors duration-500" style={{ animationDelay: '0s' }}></div>
      <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-gradient-to-tr from-indigo-200/30 to-purple-200/30 dark:from-indigo-600/10 dark:to-purple-500/10 rounded-full blur-3xl animate-float mix-blend-multiply dark:mix-blend-screen transition-colors duration-500" style={{ animationDelay: '2s' }}></div>
      <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-gradient-to-r from-slate-200/30 to-blue-200/30 dark:from-slate-800/20 dark:to-blue-800/10 rounded-full blur-3xl animate-float mix-blend-multiply dark:mix-blend-screen transition-colors duration-500" style={{ animationDelay: '4s' }}></div>
    </div>
  );
}

function StatusBadges() {
  return (
    <div className="flex items-center justify-center gap-3">
      <div className="px-3 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 text-blue-700 dark:text-blue-300 rounded-full text-xs font-semibold border border-blue-200/50 dark:border-blue-700/50 backdrop-blur-sm transition-colors duration-300">
        {UI_CONFIG.version}
      </div>
      <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 rounded-full border border-green-200/50 dark:border-green-700/50 backdrop-blur-sm transition-colors duration-300">
        <div className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full animate-pulse shadow-sm"></div>
        <span className="text-xs text-green-700 dark:text-green-400 font-semibold">ONLINE</span>
      </div>
    </div>
  );
}

interface FormFieldProps {
  id: string;
  label: string;
  icon: React.ElementType;
  required?: boolean;
  type: 'input' | 'textarea';
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

function FormField({ id, label, icon: Icon, required = false, type, value, onChange, placeholder }: FormFieldProps) {
  const baseClassName = "border-2 border-gray-200/80 dark:border-slate-700/80 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 dark:focus:border-blue-400 dark:focus:ring-blue-400/20 text-base shadow-sm hover:shadow-md transition-all duration-300 rounded-xl bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 font-medium";

  return (
    <div className="space-y-3">
      <label htmlFor={id} className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-500/20">
          <Icon className="w-4 h-4" />
        </div>
        <span className="flex-1">{label}</span>
        {required && (
          <div className="text-xs text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-900/30 px-2.5 py-1 rounded-full border border-amber-200/50 dark:border-amber-700/50 transition-colors duration-300">REQUIRED</div>
        )}
      </label>
      {type === 'input' ? (
        <Input
          id={id}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${baseClassName} h-14`}
        />
      ) : (
        <Textarea
          id={id}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${baseClassName} min-h-[160px] resize-none leading-relaxed`}
          rows={6}
        />
      )}
    </div>
  );
}

interface ErrorDisplayProps {
  error: ErrorState;
  onRetry: () => void;
}

function ErrorDisplay({ error, onRetry }: ErrorDisplayProps) {
  return (
    <div className="bg-red-50/80 dark:bg-red-950/30 backdrop-blur-sm border border-red-200 dark:border-red-900/50 p-4 rounded-xl transition-colors duration-300">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="font-semibold text-red-800 dark:text-red-300 mb-1">{error.title}</div>
          <div className="text-red-700 dark:text-red-400/90 text-sm mb-2 leading-relaxed">{error.message}</div>
          <div className="text-red-600 dark:text-red-500 text-xs mb-3">{error.suggestion}</div>

          <div className="flex items-center gap-3">
            {error.canRetry && (
              <Button
                onClick={onRetry}
                size="sm"
                variant="outline"
                className="text-red-700 dark:text-red-400 border-red-300 dark:border-red-800/50 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-800 dark:hover:text-red-300 transition-colors"
              >
                重试
              </Button>
            )}
            <span className="text-xs text-red-500/80 dark:text-red-500/60 font-medium">错误ID: {error.errorId}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Custom hooks
function useFormValidation(formData: FormData) {
  const isValid = formData.keyword.trim() && formData.userInfo.trim();

  const validateAndGetError = (): ErrorState | null => {
    if (!isValid) {
      return formatErrorForUser('请填写关键词和原始资料');
    }
    return null;
  };

  return { isValid, validateAndGetError };
}

export default function GeneratorClient() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    keyword: '',
    userInfo: ''
  });
  const [error, setError] = useState<ErrorState | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const { isValid, validateAndGetError } = useFormValidation(formData);

  const updateFormField = (field: keyof FormData) => (value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null); // Clear error when user starts typing
  };

  const handleGenerate = () => {
    const validationError = validateAndGetError();
    if (validationError) {
      setError(validationError);
      return;
    }

    // 立即显示加载状态
    setIsGenerating(true);

    // 立即跳转，不需要任何等待
    const params = new URLSearchParams({
      keyword: formData.keyword.trim(),
      userInfo: formData.userInfo.trim()
    });

    router.push(`/generate?${params.toString()}`);
  };

  const handleRetry = () => {
    setError(null);
    handleGenerate();
  };

  return (
    <div className="min-h-screen bg-transparent relative overflow-hidden">
      <BackgroundDecorations />

      <div className="relative z-10 container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8">
          <Card className="glass-card animate-fade-in hover-lift relative transition-all duration-500 overflow-hidden rounded-[2rem]">
            {/* Header decoration */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600 dark:from-blue-600 dark:via-indigo-600 dark:to-purple-700"></div>

            {/* Background texture */}
            <div className="absolute inset-0 opacity-[0.03] dark:opacity-5">
              <div className="absolute inset-0" style={{
                backgroundImage: `radial-gradient(circle at 25% 25%, currentColor 1px, transparent 1px)`,
                backgroundSize: '24px 24px'
              }}></div>
            </div>

            <CardHeader className="pb-4 px-4 sm:px-6 lg:px-10 pt-10 relative z-10">
              <CardTitle className="text-xl sm:text-2xl lg:text-3xl">
                <div className="text-center">
                  <div className="bg-gradient-to-r from-slate-900 via-blue-700 to-indigo-700 dark:from-white dark:via-blue-400 dark:to-indigo-400 bg-clip-text text-transparent font-extrabold leading-tight tracking-tight mb-4">
                    {UI_CONFIG.title}
                  </div>
                  <StatusBadges />
                </div>
              </CardTitle>
              <CardDescription className="text-base sm:text-lg text-slate-600 dark:text-slate-400 mt-5 font-medium text-center">
                <div className="flex items-center justify-center gap-2.5">
                  <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse shadow-sm shadow-blue-500/50"></div>
                  {UI_CONFIG.description}
                </div>
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-8 px-4 sm:px-6 lg:px-10 pb-10 relative z-10">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
                <FormField
                  id="topic"
                  label="文案主题"
                  icon={Target}
                  required
                  type="input"
                  value={formData.keyword}
                  onChange={updateFormField('keyword')}
                  placeholder={UI_CONFIG.placeholders.keyword}
                />

                <div className="xl:row-span-2">
                  <FormField
                    id="material"
                    label="素材内容"
                    icon={FileText}
                    required
                    type="textarea"
                    value={formData.userInfo}
                    onChange={updateFormField('userInfo')}
                    placeholder={UI_CONFIG.placeholders.userInfo}
                  />
                </div>
              </div>

              {error && <ErrorDisplay error={error} onRetry={handleRetry} />}

              <div className="flex justify-center pt-8 border-t border-slate-200/50 dark:border-slate-800/50 mt-8">
                <Button
                  onClick={handleGenerate}
                  disabled={!isValid || isGenerating}
                  className="px-10 py-7 text-lg font-bold shadow-xl shadow-blue-500/20 hover:shadow-2xl hover:shadow-blue-500/40 transition-all duration-500 w-full sm:w-auto min-w-[320px] max-w-md group relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white border-0 rounded-2xl transform hover:-translate-y-1 active:scale-95 disabled:opacity-70 disabled:hover:translate-y-0 disabled:active:scale-100 disabled:shadow-none"
                >
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-8 h-8 bg-white/20 dark:bg-black/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      {isGenerating ? (
                        <Loader2 className="w-5 h-5 animate-spin text-white" />
                      ) : (
                        <Sparkles className="w-5 h-5 text-white group-hover:scale-110 group-hover:rotate-12 transition-all duration-300" />
                      )}
                    </div>
                    <span className="tracking-wide">{isGenerating ? '正在启动 AI 核心...' : UI_CONFIG.buttonText}</span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}