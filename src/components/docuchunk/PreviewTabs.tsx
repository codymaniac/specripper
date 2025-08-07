'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Copy, FileQuestion, Hash, Download, GitFork, FileText, FileCode, Tag, Lightbulb, Tags } from 'lucide-react';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import type { ModelName } from '@/app/page';
import { type Chunk } from '@/lib/text';
import { Label } from '../ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface PreviewTabsProps {
  sourceText: string;
  cleanedText: string;
  chunks: Chunk[];
  isLoading: boolean;
  selectedModel: ModelName;
  file: File | null;
}

const MODEL_CONTEXT_WINDOWS: Record<ModelName, number> = {
  'Llama3': 8192,
  'Claude': 200000,
  'Gemini': 32768,
};

const estimateTokens = (text: string) => Math.ceil(text.length / 4);

export function PreviewTabs({ sourceText, cleanedText, chunks, isLoading, selectedModel, file }: PreviewTabsProps) {
  const { toast } = useToast();

  const copyToClipboard = (chunk: Chunk, type: string) => {
    navigator.clipboard.writeText(JSON.stringify(chunk, null, 2));
    toast({ title: `Copied ${type}`, description: `Chunk ${chunk.chunk_id} has been copied to your clipboard.` });
  };

  const downloadChunks = () => {
    if (!file) {
        toast({ title: "Cannot Download", description: "No file is loaded.", variant: "destructive" });
        return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(chunks, null, 2));
    const jsonFileName = file.name.endsWith('.pdf') ? file.name.replace(/\.pdf$/i, '.json') : `${file.name}.json`;
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", jsonFileName);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    toast({ title: "Download Started", description: `Your file ${jsonFileName} is downloading.` });
  };
  
  const renderContent = () => {
    if (!sourceText) {
      return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-12rem)] border-2 border-dashed rounded-lg bg-card">
          <FileQuestion className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-foreground">Awaiting Document</h2>
          <p className="text-muted-foreground mt-2">Upload a PDF to begin processing.</p>
        </div>
      );
    }

    return (
      <Tabs defaultValue="chunks">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="chunks">Chunks</TabsTrigger>
          <TabsTrigger value="cleaned">Cleaned Text</TabsTrigger>
          <TabsTrigger value="source">Source Text</TabsTrigger>
        </TabsList>

        <TabsContent value="chunks" className="mt-4">
          <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="font-headline">Generated Chunks</CardTitle>
                        <CardDescription>
                            {isLoading ? 'Generating chunks...' : chunks.length > 0 ? `Showing ${chunks.length} chunks optimized for ${selectedModel}.` : 'No chunks generated yet. Configure and click "Generate Chunks".'}
                        </CardDescription>
                    </div>
                    {chunks.length > 0 && !isLoading && (
                        <Button variant="outline" size="sm" onClick={downloadChunks}>
                            <Download className="h-4 w-4 mr-2"/>
                            Download Chunks
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-20rem)] pr-4">
                <div className="space-y-4">
                  {isLoading && Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}
                  {!isLoading && chunks.map((chunk) => {
                    const contextLimit = MODEL_CONTEXT_WINDOWS[selectedModel];
                    const utilization = Math.min((chunk.metadata.token_count / contextLimit) * 100, 100);

                    return (
                      <Card key={chunk.chunk_id} className="bg-background/50">
                        <CardHeader className="flex flex-row justify-between items-start p-4">
                           <div className="space-y-1">
                                <CardTitle className="text-lg font-normal">{chunk.title}</CardTitle>
                                <CardDescription className="flex items-center gap-2 flex-wrap">
                                    <Badge variant="outline" className="flex items-center gap-1"><Hash className="h-3 w-3" /> {chunk.chunk_id}</Badge>
                                    <Badge variant="secondary" className="flex items-center gap-1">
                                        <Tag className="h-3 w-3" /> 
                                        {chunk.metadata.semantic_label}
                                        {chunk.metadata.semantic_label_reason && (
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Lightbulb className="h-3 w-3 ml-1.5 cursor-help" />
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>{chunk.metadata.semantic_label_reason}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        )}
                                    </Badge>
                                    {chunk.metadata.section_id && <Badge variant="outline" className="flex items-center gap-1"><FileCode className="h-3 w-3" /> Section ID: {chunk.metadata.section_id}</Badge>}
                                    {chunk.metadata.parent_id && <Badge variant="outline" className="flex items-center gap-1"><GitFork className="h-3 w-3" /> Parent: {chunk.metadata.parent_id}</Badge>}
                                    {chunk.metadata.section && <Badge variant="outline" className="flex items-center gap-1"><FileText className="h-3 w-3" /> Section: {chunk.metadata.section}</Badge>}
                                </CardDescription>
                           </div>
                           <Button variant="ghost" size="icon" onClick={() => copyToClipboard(chunk, `Chunk ${chunk.chunk_id}`)}>
                                <Copy className="h-4 w-4"/>
                           </Button>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{chunk.content}</p>
                        </CardContent>
                        <CardFooter className="flex flex-col items-start space-y-4 p-4 pt-0">
                           <div className="flex items-center gap-2 text-xs w-full flex-wrap">
                                <div className="flex items-center gap-1 text-muted-foreground"><Tags className="h-3 w-3" /> Keywords:</div>
                                {chunk.metadata.keywords.length > 0 ? chunk.metadata.keywords.map(kw => <Badge key={kw} variant="secondary">{kw}</Badge>) : <span className="text-xs text-muted-foreground">None</span>}
                           </div>

                          <div className="flex items-center gap-4 text-xs w-full">
                            <Badge variant="secondary">Chars: {chunk.metadata.char_count}</Badge>
                            <Badge variant="secondary">~Tokens: {chunk.metadata.token_count}</Badge>
                          </div>
                          <div className="w-full pt-2">
                            <Label className="text-xs text-muted-foreground">{`Context Simulation for ${selectedModel}: ${chunk.metadata.token_count} / ${contextLimit} tokens`}</Label>
                            <Progress value={utilization} className="h-2 mt-1" />
                          </div>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="cleaned" className="mt-4">
          <Textarea readOnly value={cleanedText} className="h-[calc(100vh-12rem)] font-mono text-xs" placeholder="Cleaned text will appear here." />
        </TabsContent>
        <TabsContent value="source" className="mt-4">
          <Textarea readOnly value={sourceText} className="h-[calc(100vh-12rem)] font-mono text-xs" placeholder="Source text from PDF will appear here." />
        </TabsContent>
      </Tabs>
    );
  };
  
  return renderContent();
}
