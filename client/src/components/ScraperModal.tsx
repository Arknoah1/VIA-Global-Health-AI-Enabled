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

  const startScrape = async () => {
    setStatus('scanning');
    setProgress(0);
    setLogs(['Initializing scraper...', 'Connecting to www.viaglobalhealth.com...']);
    setFoundCount(0);

    try {
      // Simulate progress while scraping
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 3, 90));
        setLogs((prev) => [...prev, `Scanning page...`].slice(-5));
      }, 800);

      // Call the real scraping API
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error('Scraping failed');
      }

      const data = await response.json();
      
      setStatus('completed');
      setProgress(100);
      setFoundCount(data.products.length);
      setLogs((prev) => [...prev, `Successfully extracted ${data.products.length} products!`]);
      onComplete(data.products);
    } catch (error) {
      setStatus('error');
      setLogs((prev) => [...prev, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    }
  };

  useEffect(() => {
    // Cleanup - no longer needed since we're using async/await
  }, []);

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
                  ) : status === 'error' ? (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                  {status === 'completed' ? 'Scraping Complete' : status === 'error' ? 'Scraping Failed' : status}
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
          ) : status === 'error' ? (
            <div className="flex w-full gap-2">
              <Button variant="outline" className="flex-1" onClick={reset}>Close</Button>
              <Button className="flex-1" onClick={startScrape}>Retry</Button>
            </div>
          ) : (
            <Button variant="destructive" className="w-full" onClick={reset}>Stop Extraction</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
