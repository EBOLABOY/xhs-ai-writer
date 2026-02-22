'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GeneratorFormData, ErrorState } from '@/lib/types'
import { Sparkles, Target, FileText, Loader2, AlertCircle } from 'lucide-react'

// Constants
const UI_CONFIG = {
  title: '文案生成引擎',
  version: 'Engine v2.1',
  description: '输入核心关键词与有效素材，由智能算法自动化构建高质量小红书爆款图文',
  placeholders: {
    keyword: '如：年度护肤爱用物、大厂社畜工作流、小众旅行地...',
    userInfo: '在这里补充所需的情感基调、细节、功能点，或任何参考草稿...'
  },
  buttonText: '开始生成引擎'
} as const;

function StatusBadges() {
  return (
    <div className="flex flex-wrap items-center gap-2 mt-3">
      <div className="px-2 py-0.5 bg-secondary text-secondary-foreground rounded text-[10px] font-mono tracking-wider uppercase border border-border">
        {UI_CONFIG.version}
      </div>
      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded border border-green-500/20 text-[10px] font-mono tracking-wider uppercase">
        <div className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
        Operational
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
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="flex-1 tracking-tight">{label}</span>
        {required && (
          <span className="text-[10px] text-muted-foreground font-mono uppercase bg-muted/50 px-1.5 py-0.5 rounded border">Req</span>
        )}
      </label>
      {type === 'input' ? (
        <Input
          id={id}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 bg-background/50 border-input focus-visible:ring-1 focus-visible:ring-primary shadow-sm rounded-lg transition-colors"
        />
      ) : (
        <Textarea
          id={id}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[160px] resize-none leading-relaxed bg-background/50 border-input focus-visible:ring-1 focus-visible:ring-primary shadow-sm rounded-lg transition-colors p-3"
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
    <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="font-semibold text-destructive mb-1 text-sm">{error.title}</div>
          <div className="text-destructive/90 text-sm mb-2 leading-relaxed">{error.message}</div>
          <div className="text-destructive/80 text-xs mb-3">{error.suggestion}</div>

          <div className="flex items-center gap-3">
            {error.canRetry && (
              <Button
                onClick={onRetry}
                size="sm"
                variant="outline"
                className="text-destructive border-destructive/30 hover:bg-destructive shadow-none hover:text-destructive-foreground h-8 text-xs"
              >
                重试
              </Button>
            )}
            <span className="text-[10px] text-destructive/50 font-mono">ID: {error.errorId}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function useFormValidation(formData: GeneratorFormData) {
  const isValid = formData.keyword.trim() && formData.userInfo.trim();

  const validateAndGetError = (): ErrorState | null => {
    if (!isValid) {
      return {
        title: '输入不完整',
        message: '请提供核心主题与其相关有效素材。',
        suggestion: '请填写上方两个输入框后再试。',
        canRetry: false,
        errorId: `VAL_${Date.now()}`
      };
    }
    return null;
  };

  return { isValid, validateAndGetError };
}

export default function GeneratorClient() {
  const router = useRouter();
  const [formData, setFormData] = useState<GeneratorFormData>({
    keyword: '',
    userInfo: ''
  });
  const [error, setError] = useState<ErrorState | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const { isValid, validateAndGetError } = useFormValidation(formData);

  const updateFormField = (field: keyof GeneratorFormData) => (value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const handleGenerate = () => {
    const validationError = validateAndGetError();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsGenerating(true);

    try {
      const params = new URLSearchParams({
        keyword: formData.keyword.trim(),
        userInfo: formData.userInfo.trim()
      });

      router.push(`/generate?${params.toString()}`);
    } catch {
      setIsGenerating(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    handleGenerate();
  };

  return (
    <div className="w-full">
      <Card className="glass-panel overflow-hidden border-border/50 bg-background/60 backdrop-blur-xl shadow-2xl relative">
        <CardHeader className="pb-6 pt-8 px-6 sm:px-8 border-b border-border/30">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                {UI_CONFIG.title}
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-2 max-w-md">
                {UI_CONFIG.description}
              </CardDescription>
            </div>
            <StatusBadges />
          </div>
        </CardHeader>

        <CardContent className="space-y-8 p-6 sm:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField
              id="topic"
              label="核心主题"
              icon={Target}
              required
              type="input"
              value={formData.keyword}
              onChange={updateFormField('keyword')}
              placeholder={UI_CONFIG.placeholders.keyword}
            />

            <div className="md:row-span-2">
              <FormField
                id="material"
                label="素材参考"
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

          <div className="flex justify-end pt-4 border-t border-border/40 mt-8">
            <Button
              onClick={handleGenerate}
              disabled={!isValid || isGenerating}
              className="w-full sm:w-auto min-w-[200px] h-12 text-sm font-semibold relative overflow-hidden bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-all shadow-md group"
            >
              <span className="flex items-center justify-center gap-2">
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-primary-foreground/70" />
                    <span>执行中...</span>
                  </>
                ) : (
                  <>
                    <span>{UI_CONFIG.buttonText}</span>
                    <Sparkles className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}