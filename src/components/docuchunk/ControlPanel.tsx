
'use client';

import { useState, type Dispatch, type SetStateAction, useEffect } from 'react';
import { FileUp, Trash2, Plus, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { parsePdf } from '@/lib/pdf';
import { type CleaningOptions, type CustomRule, performLocalChunking, type Chunk, type StandardRule } from '@/lib/text';
import type { ModelName } from '@/app/page';
import { ToastAction } from '../ui/toast';

const MODEL_CONTEXT_WINDOWS: Record<ModelName, number> = {
  'Llama3': 8192,
  'Claude': 200000,
  'Gemini': 32768,
};

const MODEL_DEFAULT_CHUNK_SIZES: Record<ModelName, number> = {
  'Llama3': 2048,
  'Claude': 4096,
  'Gemini': 4096,
};

interface ControlPanelProps {
  onTextExtracted: (text: string, file: File) => void;
  setChunks: Dispatch<SetStateAction<Chunk[]>>;
  cleanedText: string;
  isLoading: boolean;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  selectedModel: ModelName;
  setSelectedModel: Dispatch<SetStateAction<ModelName>>;
  file: File | null;
  cleaningRules: CleaningOptions;
  setCleaningRules: Dispatch<SetStateAction<CleaningOptions>>;
}

export function ControlPanel({
  onTextExtracted,
  setChunks,
  cleanedText,
  isLoading,
  setIsLoading,
  selectedModel,
  setSelectedModel,
  file,
  cleaningRules,
  setCleaningRules,
}: ControlPanelProps) {
  const [isParsing, setIsParsing] = useState(false);
  const [chunkSize, setChunkSize] = useState(MODEL_DEFAULT_CHUNK_SIZES[selectedModel]);
  const [overlap, setOverlap] = useState(200);
  const [isSaveRuleDialogOpen, setIsSaveRuleDialogOpen] = useState(false);
  const [ruleToSave, setRuleToSave] = useState<CustomRule | null>(null);
  const [newRuleName, setNewRuleName] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    setChunkSize(MODEL_DEFAULT_CHUNK_SIZES[selectedModel]);
  }, [selectedModel]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({ title: "Invalid File Type", description: "Please upload a PDF file.", variant: "destructive" });
        return;
      }
      setIsParsing(true);
      try {
        const text = await parsePdf(file);
        onTextExtracted(text, file);
        toast({ title: "PDF Parsed", description: `${file.name} has been successfully processed.` });
      } catch (error) {
        console.error("Failed to parse PDF", error);
        toast({ title: "Parsing Error", description: "Could not parse the PDF file.", variant: "destructive" });
      } finally {
        setIsParsing(false);
      }
    }
  };

  const updateStandardRule = (ruleId: string, enabled: boolean) => {
    setCleaningRules(prev => ({
      ...prev,
      standardRules: prev.standardRules.map(r => r.id === ruleId ? { ...r, enabled } : r),
    }));
  };

  const removeStandardRule = (ruleId: string) => {
    const originalRules = [...cleaningRules.standardRules];
    const ruleToRemove = originalRules.find(r => r.id === ruleId);
    if (!ruleToRemove) return;

    setCleaningRules(prev => ({
        ...prev,
        standardRules: prev.standardRules.filter(r => r.id !== ruleId),
    }));
    
    toast({ 
        title: "Standard Rule Removed",
        description: `"${ruleToRemove.name}" has been removed.`,
        action: <ToastAction altText="Undo" onClick={() => {
            setCleaningRules(prev => ({...prev, standardRules: originalRules}));
        }}>Undo</ToastAction>
    });
  };
  
  const addCustomRule = () => {
    setCleaningRules(prev => ({ ...prev, customRules: [...prev.customRules, { find: '', replace: '', isRegex: true, flags: 'gi' }] }));
  };

  const updateCustomRule = (index: number, field: keyof CustomRule, value: string | boolean) => {
    setCleaningRules(prev => {
      const newRules = [...prev.customRules];
      (newRules[index] as any)[field] = value;
      return { ...prev, customRules: newRules };
    });
  };

  const removeCustomRule = (index: number) => {
    const originalRules = [...cleaningRules.customRules];
    const ruleToRemove = originalRules[index];

    setCleaningRules(prev => ({ ...prev, customRules: prev.customRules.filter((_, i) => i !== index) }));

    toast({
        title: "Custom Rule Removed",
        description: `Rule "${ruleToRemove.find.substring(0, 20)}..." was removed.`,
        action: <ToastAction altText="Undo" onClick={() => {
            setCleaningRules(prev => ({...prev, customRules: originalRules}));
        }}>Undo</ToastAction>
    });
  };

  const handleSaveRule = () => {
    if (!newRuleName.trim() || !ruleToSave) {
      toast({ title: "Invalid Name", description: "Please provide a name for the rule.", variant: "destructive" });
      return;
    }

    const newStandardRule: StandardRule = {
      ...ruleToSave,
      id: `custom-${Date.now()}`,
      name: newRuleName,
      enabled: true,
    };
    
    setCleaningRules(prev => ({
      ...prev,
      standardRules: [...prev.standardRules, newStandardRule],
      customRules: prev.customRules.filter(r => r !== ruleToSave),
    }));

    toast({ title: "Rule Saved", description: `"${newRuleName}" has been added to your standard rules.` });
    setIsSaveRuleDialogOpen(false);
    setNewRuleName('');
    setRuleToSave(null);
  };

  const openSaveRuleDialog = (rule: CustomRule) => {
    if (!rule.find) {
      toast({ title: "Cannot Save Empty Rule", description: "Please define the 'find' pattern for the rule.", variant: "destructive" });
      return;
    }
    setRuleToSave(rule);
    setNewRuleName('');
    setIsSaveRuleDialogOpen(true);
  };
  
  const handleChunking = async () => {
    if (!cleanedText) {
      toast({ title: 'No text to chunk', description: 'Please upload and clean a document first.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    setChunks([]);
    try {
      const result = performLocalChunking(cleanedText, chunkSize, overlap);
      setChunks(result);
      toast({ title: 'Chunking Successful', description: `Document has been split into ${result.length} chunks.` });
    } catch (error) {
      console.error('Chunking failed:', error);
      toast({ title: 'Chunking Failed', description: 'An error occurred while chunking the document.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card className="sticky top-24">
        <CardHeader>
          <CardTitle className="font-headline">Controls</CardTitle>
          <CardDescription>Configure and process your document.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file-upload">1. Upload PDF</Label>
            <div className="flex items-center space-x-2">
              <Input id="file-upload" type="file" accept="application/pdf" onChange={handleFileChange} className="hidden" />
              <Button asChild variant="outline">
                <Label htmlFor="file-upload" className="cursor-pointer flex items-center gap-2 w-full justify-center">
                  <FileUp className="h-4 w-4" />
                  <span>{file ? 'Change file' : 'Select PDF'}</span>
                </Label>
              </Button>
              {isParsing && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
            </div>
            {file && <p className="text-sm text-muted-foreground truncate pt-2">Selected: {file.name}</p>}
          </div>
          
          <Accordion type="multiple" defaultValue={['cleaning-rules', 'chunking']} className="w-full">
            <AccordionItem value="cleaning-rules">
              <AccordionTrigger className="text-base">2. Cleaning Rules</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Standard Removals</h4>
                  {cleaningRules.standardRules.map(rule => (
                    <div key={rule.id} className="flex items-center space-x-2">
                      <Checkbox id={rule.id} checked={rule.enabled} onCheckedChange={(c) => updateStandardRule(rule.id, c as boolean)} />
                      <Label htmlFor={rule.id} className="text-sm font-normal flex-1">{rule.name}</Label>
                      <Button variant="ghost" size="icon" onClick={() => removeStandardRule(rule.id)} className="h-8 w-8">
                          <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Custom Rules (Regex)</h4>
                  {cleaningRules.customRules.map((rule, index) => (
                    <div key={index} className="grid grid-cols-[1fr_1fr_60px_auto_auto] items-center gap-2">
                      <Input placeholder="Find (regex)" value={rule.find} onChange={(e) => updateCustomRule(index, 'find', e.target.value)} />
                      <Input placeholder="Replace" value={rule.replace} onChange={(e) => updateCustomRule(index, 'replace', e.target.value)} />
                      <Input placeholder="Flags" value={rule.flags} onChange={(e) => updateCustomRule(index, 'flags', e.target.value)} />
                      <Button variant="ghost" size="icon" onClick={() => openSaveRuleDialog(rule)}><Save className="h-4 w-4 text-accent" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => removeCustomRule(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addCustomRule} className="flex items-center gap-2"><Plus className="h-4 w-4" /> Add Rule</Button>
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="chunking">
              <AccordionTrigger className="text-base">3. Chunking</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="model-select">Target Model</Label>
                  <Select value={selectedModel} onValueChange={(v) => setSelectedModel(v as ModelName)}>
                    <SelectTrigger id="model-select">
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Gemini">Gemini</SelectItem>
                      <SelectItem value="Llama3">Llama3</SelectItem>
                      <SelectItem value="Claude">Claude</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Model choice sets a default chunk size.</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                      <Label htmlFor="chunk-size">Max Chunk Size (tokens)</Label>
                      <span className="text-sm font-medium">{chunkSize}</span>
                  </div>
                  <Slider id="chunk-size" min={100} max={MODEL_CONTEXT_WINDOWS[selectedModel]} step={50} value={[chunkSize]} onValueChange={(v) => setChunkSize(v[0])} />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                      <Label htmlFor="overlap-size">Chunk Overlap (tokens)</Label>
                      <span className="text-sm font-medium">{overlap}</span>
                  </div>
                  <Slider id="overlap-size" min={0} max={500} step={25} value={[overlap]} onValueChange={(v) => setOverlap(v[0])} />
                </div>

                <Button onClick={handleChunking} disabled={isLoading || isParsing || !cleanedText} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generate Chunks'}
                </Button>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <Dialog open={isSaveRuleDialogOpen} onOpenChange={setIsSaveRuleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Standard Rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Give this rule a memorable name. It will appear as a new checkbox in the "Standard Removals" list.
            </p>
            <div>
                <Label htmlFor="rule-name">Rule Name</Label>
                <Input 
                    id="rule-name" 
                    value={newRuleName} 
                    onChange={e => setNewRuleName(e.target.value)} 
                    placeholder="e.g., Remove confidential markers" 
                />
            </div>
            {ruleToSave && (
              <div className="text-sm space-y-1">
                  <p><span className="font-semibold">Find (Regex):</span> <code className="bg-muted text-muted-foreground rounded px-1">{ruleToSave.find}</code></p>
                  <p><span className="font-semibold">Replace:</span> <code className="bg-muted text-muted-foreground rounded px-1">{ruleToSave.replace}</code></p>
                  <p><span className="font-semibold">Flags:</span> <code className="bg-muted text-muted-foreground rounded px-1">{ruleToSave.flags}</code></p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsSaveRuleDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveRule}>Save Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
