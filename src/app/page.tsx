'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/docuchunk/Header';
import { ControlPanel } from '@/components/docuchunk/ControlPanel';
import { PreviewTabs } from '@/components/docuchunk/PreviewTabs';
import { type CleaningOptions, type Chunk, initialCleaningOptions, applyCleaningRules } from '@/lib/text';

export type ModelName = 'Llama3' | 'Claude' | 'Gemini';

const LOCAL_STORAGE_KEY = 'docuchunk_data_v3'; 

export default function Home() {
  const [sourceText, setSourceText] = useState<string>('');
  const [cleanedText, setCleanedText] = useState<string>('');
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelName>('Gemini');
  const [file, setFile] = useState<File | null>(null);
  const [cleaningRules, setCleaningRules] = useState<CleaningOptions>(initialCleaningOptions);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    try {
      const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedData) {
        const { sourceText, chunks, selectedModel, cleaningRules: savedRules } = JSON.parse(savedData);
        if (sourceText) setSourceText(sourceText);
        if (chunks) setChunks(chunks);
        if (selectedModel) setSelectedModel(selectedModel);
        
        if (savedRules) {
            // Restore saved rules, but ensure the core default rules are always present.
            const restoredRules = { ...initialCleaningOptions, ...savedRules };
            const savedRuleIds = new Set(restoredRules.standardRules.map(r => r.id));
            const missingStandardRules = initialCleaningOptions.standardRules.filter(r => !savedRuleIds.has(r.id));
            
            if (missingStandardRules.length > 0) {
                // Add missing defaults to the front of the list to maintain order.
                restoredRules.standardRules = [...missingStandardRules, ...restoredRules.standardRules];
            }

            setCleaningRules(restoredRules);
        }

      }
    } catch (error) {
      console.error("Failed to load from localStorage", error);
    }
    setIsInitialLoad(false);
  }, []);

  useEffect(() => {
    if (isInitialLoad) return;
    try {
        const newCleanedText = applyCleaningRules(sourceText, cleaningRules);
        setCleanedText(newCleanedText);
        const dataToSave = JSON.stringify({ sourceText, chunks, selectedModel, cleaningRules });
        localStorage.setItem(LOCAL_STORAGE_KEY, dataToSave);
    } catch (error) {
        console.error("Failed to process or save to localStorage", error);
    }
  }, [sourceText, chunks, selectedModel, cleaningRules, isInitialLoad]);


  const handleTextExtracted = (text: string, file: File) => {
    setSourceText(text);
    setFile(file);
    setChunks([]); // Reset chunks when a new file is uploaded
  };
  
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-8 items-start">
          <div className="lg:col-span-1 xl:col-span-1">
            <ControlPanel
              onTextExtracted={handleTextExtracted}
              setChunks={setChunks}
              cleanedText={cleanedText}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              file={file}
              cleaningRules={cleaningRules}
              setCleaningRules={setCleaningRules}
            />
          </div>
          <div className="lg:col-span-2 xl:col-span-3">
            <PreviewTabs
              sourceText={sourceText}
              cleanedText={cleanedText}
              chunks={chunks}
              isLoading={isLoading}
              selectedModel={selectedModel}
              file={file}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
