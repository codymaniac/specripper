import { FileText } from 'lucide-react';

export function Header() {
  return (
    <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-headline font-bold text-foreground">
              SpecRipper
            </h1>
          </div>
          <p className="text-sm text-muted-foreground hidden md:block">Intelligent Document Preparation</p>
        </div>
      </div>
    </header>
  );
}
