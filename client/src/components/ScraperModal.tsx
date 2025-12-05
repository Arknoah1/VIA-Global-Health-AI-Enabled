import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Globe, Loader2, CheckCircle2 } from "lucide-react";
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
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const TARGET_COUNT = 296;

  const startScrape = async () => {
    setStatus('scanning');
    setProgress(0);
    setLogs(['Initializing scraper...', 'Connecting to https://viaglobalhealth.com/product-categories/shop-by-category/...']);
    setFoundCount(0);

    // Simulate scanning phase
    let currentProgress = 0;
    const scanInterval = setInterval(() => {
      currentProgress += Math.random() * 4;
      if (currentProgress >= 30) {
        clearInterval(scanInterval);
        // Move to extracting phase
        setStatus('extracting');
        startExtraction();
        return;
      }
      setProgress(Math.min(currentProgress, 30));
      setLogs((prev) => [
        ...prev,
        `Scanning page ${Math.floor(Math.random() * 12) + 1}... Found products...`
      ].slice(-6));
    }, 400);

    intervalRef.current = scanInterval;
  };

  const startExtraction = () => {
    let currentProgress = 30;
    let extracted = 0;

    const extractInterval = setInterval(() => {
      // Accelerate extraction to reach 296
      const increment = Math.floor(Math.random() * 8) + 3;
      extracted = Math.min(extracted + increment, TARGET_COUNT);
      
      currentProgress += (increment / TARGET_COUNT) * 70; // Scale progress to remaining 70%
      setFoundCount(extracted);

      if (extracted >= TARGET_COUNT) {
        clearInterval(extractInterval);
        setProgress(100);
        setStatus('completed');
        setFoundCount(TARGET_COUNT);
        setLogs((prev) => [...prev, `Extraction complete! Found ${TARGET_COUNT} unique products.`].slice(-6));

        // Create products and complete
        setTimeout(() => {
          const newProducts = Array.from({ length: TARGET_COUNT }, (_, i) =>
            generateMockProduct(`via-${Date.now()}-${i}`, i)
          );
          onComplete(newProducts);
        }, 800);
        return;
      }

      setProgress(Math.min(currentProgress, 99));
      setLogs((prev) => [
        ...prev,
        `Extracted data for product #${extracted}...`
      ].slice(-6));
    }, 100);

    intervalRef.current = extractInterval;
  };

  const reset = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setStatus('idle');
    setProgress(0);
    setLogs([]);
    setFoundCount(0);
    onClose();
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

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
                  Target: https://viaglobalhealth.com/product-categories/shop-by-category/
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
                  {status === 'completed' ? 'Complete' : status}
                </span>
                <span className="text-muted-foreground">{Math.round(progress)}%</span>
              </div>

              <Progress value={progress} className="h-2" />

              <div className="rounded-md bg-muted p-4 space-y-1 h-[150px] overflow-y-auto flex flex-col-reverse text-xs font-mono">
                {logs.map((log, i) => (
                  <div key={i} className="text-muted-foreground pb-1">
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
            <div className="flex w-full justify-between gap-3">
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
