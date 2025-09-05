import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { BookOpen, Film, Radio, Mic, FileText, Bot, Brain, Sparkles, Zap, Languages, Globe } from "lucide-react";
import { LLMProvider } from "@/utils/llmApi";

type InitialMedium = 'novel' | 'screenplay';
type OutputMedium = 'audio_drama' | 'novel' | 'screenplay' | 'podcast_script' | 'radio_drama';
type Purpose = 'transform_medium' | 'translate_language';

interface ContentTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (
    initialMedium?: InitialMedium, 
    outputMedium?: OutputMedium, 
    provider?: LLMProvider,
    originalLanguage?: string,
    outputLanguage?: string,
    purpose?: Purpose
  ) => void;
  fileName: string;
}

const MEDIUM_OPTIONS = [
  { value: 'audio_drama', label: 'AudioDrama', icon: Radio },
  { value: 'novel', label: 'Novel', icon: BookOpen },
  { value: 'screenplay', label: 'Screenplay', icon: Film },
  { value: 'podcast_script', label: 'Podcast Script', icon: Mic },
  { value: 'radio_drama', label: 'Radio Drama', icon: Radio },
] as const;

const LANGUAGE_OPTIONS = [
  { value: 'english', label: 'English', flag: '🇺🇸' },
  { value: 'spanish', label: 'Spanish', flag: '🇪🇸' },
  { value: 'french', label: 'French', flag: '🇫🇷' },
  { value: 'german', label: 'German', flag: '🇩🇪' },
  { value: 'italian', label: 'Italian', flag: '🇮🇹' },
  { value: 'portuguese', label: 'Portuguese', flag: '🇵🇹' },
  { value: 'chinese', label: 'Chinese', flag: '🇨🇳' },
  { value: 'japanese', label: 'Japanese', flag: '🇯🇵' },
  { value: 'korean', label: 'Korean', flag: '🇰🇷' },
  { value: 'russian', label: 'Russian', flag: '🇷🇺' },
] as const;

const PROMPT_TEMPLATES = {
  'novel->audio_drama': 'Novel to AudioDrama',
  'screenplay->audio_drama': 'Screenplay to AudioDrama', 
  'novel->screenplay': 'Novel to Screenplay',
  'screenplay->novel': 'Screenplay to Novel',
  'novel->podcast_script': 'Novel to Podcast Script',
  'screenplay->podcast_script': 'Screenplay to Podcast Script',
  'novel->radio_drama': 'Novel to Radio Drama',
  'screenplay->radio_drama': 'Screenplay to Radio Drama',
} as const;

export function ContentTypeDialog({ open, onOpenChange, onSelect, fileName }: ContentTypeDialogProps) {
  const [purpose, setPurpose] = useState<Purpose>('transform_medium');
  const [initialMedium, setInitialMedium] = useState<InitialMedium>('novel');
  const [outputMedium, setOutputMedium] = useState<OutputMedium>('audio_drama');
  const [originalLanguage, setOriginalLanguage] = useState('english');
  const [outputLanguage, setOutputLanguage] = useState('spanish');
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider | undefined>(undefined);

  const getPromptTemplate = () => {
    if (purpose === 'translate_language') {
      const origLang = LANGUAGE_OPTIONS.find(l => l.value === originalLanguage)?.label || 'Source';
      const outLang = LANGUAGE_OPTIONS.find(l => l.value === outputLanguage)?.label || 'Target';
      return `${origLang} to ${outLang} Translation`;
    }
    
    const key = `${initialMedium}->${outputMedium}` as keyof typeof PROMPT_TEMPLATES;
    return PROMPT_TEMPLATES[key] || 'Custom conversion';
  };

  const handleSubmit = () => {
    if (purpose === 'transform_medium') {
      onSelect(initialMedium, outputMedium, selectedProvider, undefined, undefined, purpose);
    } else {
      onSelect(undefined, undefined, selectedProvider, originalLanguage, outputLanguage, purpose);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Configure Content Processing</DialogTitle>
          <DialogDescription>
            Select the purpose and configure settings for processing "{fileName}".
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Purpose Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Purpose</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={purpose === 'transform_medium' ? 'default' : 'outline'}
                className="h-20 flex flex-col gap-2"
                onClick={() => setPurpose('transform_medium')}
              >
                <Radio className="h-6 w-6" />
                <div className="text-center">
                  <div className="font-medium">Transform</div>
                  <div className="text-xs opacity-70">Change mediums</div>
                </div>
              </Button>

              <Button
                variant={purpose === 'translate_language' ? 'default' : 'outline'}
                className="h-20 flex flex-col gap-2"
                onClick={() => setPurpose('translate_language')}
              >
                <Languages className="h-6 w-6" />
                <div className="text-center">
                  <div className="font-medium">Translate</div>
                  <div className="text-xs opacity-70">Change language</div>
                </div>
              </Button>
            </div>
          </div>

          {/* Dynamic Content Based on Purpose */}
          {purpose === 'transform_medium' ? (
            <>
              {/* Initial Medium Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Original Medium</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={initialMedium === 'novel' ? 'default' : 'outline'}
                    className="h-20 flex flex-col gap-2"
                    onClick={() => setInitialMedium('novel')}
                  >
                    <BookOpen className="h-6 w-6" />
                    <div className="text-center">
                      <div className="font-medium">Novel</div>
                      <div className="text-xs opacity-70">Chapters/sections</div>
                    </div>
                  </Button>

                  <Button
                    variant={initialMedium === 'screenplay' ? 'default' : 'outline'}
                    className="h-20 flex flex-col gap-2"
                    onClick={() => setInitialMedium('screenplay')}
                  >
                    <Film className="h-6 w-6" />
                    <div className="text-center">
                      <div className="font-medium">Screenplay</div>
                      <div className="text-xs opacity-70">Scenes</div>
                    </div>
                  </Button>
                </div>
              </div>

              {/* Output Medium Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Output Medium</Label>
                <Select value={outputMedium} onValueChange={(value: OutputMedium) => setOutputMedium(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select output format" />
                  </SelectTrigger>
                  <SelectContent>
                    {MEDIUM_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      return (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {option.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <>
              {/* Language Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Original Language</Label>
                  <Select value={originalLanguage} onValueChange={setOriginalLanguage}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select original language" />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <span>{option.flag}</span>
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">Output Language</Label>
                  <Select value={outputLanguage} onValueChange={setOutputLanguage}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select target language" />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <span>{option.flag}</span>
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {/* AI Provider Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">AI Provider (Optional)</Label>
            <Select value={selectedProvider || 'default'} onValueChange={(value: LLMProvider | 'default') => setSelectedProvider(value === 'default' ? undefined : value as LLMProvider)}>
              <SelectTrigger>
                <SelectValue placeholder="Use default provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Use default provider</SelectItem>
                <SelectItem value="gemini">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Google Gemini
                  </div>
                </SelectItem>
                <SelectItem value="openai">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    OpenAI
                  </div>
                </SelectItem>
                <SelectItem value="claude">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    Anthropic Claude
                  </div>
                </SelectItem>
                <SelectItem value="xai">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    xAI Grok
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Prompt Template Preview */}
          <div className="bg-muted/50 rounded-lg p-3">
            <Label className="text-xs font-medium text-muted-foreground">Selected Template</Label>
            <div className="text-sm font-medium mt-1">{getPromptTemplate()}</div>
            <div className="text-xs text-muted-foreground mt-1">
              This template can be customized in the Prompt Manager
            </div>
          </div>

          <Button onClick={handleSubmit} className="w-full">
            Process Content
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}