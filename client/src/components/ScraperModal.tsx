import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Globe, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Product, ScrapeStatus } from "@/lib/types";
import { generateMockProduct } from "@/lib/mock-data";

interface ScraperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (newProducts: Product[]) => void;
}

export function ScraperModal({ isOpen, onClose, onComplete }: ScraperModalProps) {
  const [status, setStatus] = useState<ScrapeStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [foundCount, setFoundCount] = useState(0);

  const startScrape = () => {
    setStatus('scanning');
    setProgress(0);
    setLogs(['Initializing scraper...', 'Connecting to www.viaglobalhealth.com...']);
    setFoundCount(0);
  };

  useEffect(() => {
    if (status === 'scanning') {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 30) {
            setStatus('extracting');
            return 30;
          }
          return prev + 2;
        });
        setLogs((prev) => [...prev, `Scanning page ${Math.floor(Math.random() * 10) + 1}...`].slice(-5));
      }, 500);
      return () => clearInterval(interval);
    }

    if (status === 'extracting') {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            setStatus('completed');
            const newProducts = Array.from({ length: 5 }, (_, i) => 
              generateMockProduct(`new-${Date.now()}-${i}`)
            );
            onComplete(newProducts);
            return 100;
          }
          return prev + 5;
        });
        setFoundCount((prev) => prev + 1);
        setLogs((prev) => [...prev, `Extracted product data...`].slice(-5));
      }, 300);
      return () => clearInterval(interval);
    }
  }, [status, onComplete]);

  const reset = () => {
    setStatus('idle');
    setProgress(0);
    setLogs([]);
    setFoundCount(0);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && reset()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Scrape Product Data</DialogTitle>
          <DialogDescription>
            Extract product information from viaglobalhealth.com
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {status === 'idle' ? (
            <div className="flex flex-col items-center justify-center space-y-4 py-8 text-center">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <Globe className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">Ready to start</p>
                <p className="text-sm text-muted-foreground">
                  Target: https://www.viaglobalhealth.com/products
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium capitalize flex items-center gap-2">
                  {status === 'completed' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                  {status === 'completed' ? 'Scraping Complete' : status}
                </span>
                <span className="text-muted-foreground">{Math.round(progress)}%</span>
              </div>
              
              <Progress value={progress} className="h-2" />
              
              <div className="rounded-md bg-muted p-4 space-y-2 h-[150px] overflow-hidden flex flex-col-reverse font-mono text-xs">
                {logs.map((log, i) => (
                  <div key={i} className="text-muted-foreground border-b border-border/50 pb-1 last:border-0 last:pb-0">
                    <span className="text-primary opacity-50">[{new Date().toLocaleTimeString()}]</span> {log}
                  </div>
                ))}
              </div>

              {foundCount > 0 && (
                <div className="flex items-center justify-center p-4 bg-green-50 text-green-700 rounded-md border border-green-100">
                  <span className="font-medium">{foundCount} products extracted</span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {status === 'idle' ? (
            <div className="flex w-full justify-between">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={startScrape}>Start Extraction</Button>
            </div>
          ) : status === 'completed' ? (
            <Button className="w-full" onClick={reset}>Done</Button>
          ) : (
            <Button variant="destructive" className="w-full" onClick={reset}>Stop Extraction</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
