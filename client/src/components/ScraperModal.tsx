import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Globe, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Product, ScrapeStatus } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

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
  const [error, setError] = useState<string | null>(null);
  const [urls, setUrls] = useState<string>('https://viaglobalhealth.com/product/thermocoagulator/');
  const abortControllerRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  const startScrape = async () => {
    setStatus('scanning');
    setProgress(0);
    setLogs(['Parsing URLs...', 'Connecting to www.viaglobalhealth.com...']);
    setFoundCount(0);
    setError(null);
    abortControllerRef.current = new AbortController();

    try {
      // Parse URLs (one per line)
      const urlList = urls
        .split('\n')
        .map(u => u.trim())
        .filter(u => u.length > 0 && u.startsWith('http'));

      if (urlList.length === 0) {
        throw new Error('Please enter at least one valid URL');
      }

      // Show progress updates while scraping
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + Math.random() * 10, 90));
      }, 1000);

      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: urlList }),
        signal: abortControllerRef.current.signal,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Scraping failed");
      }

      const data = await response.json();
      
      setProgress(100);
      setFoundCount(data.count);
      setLogs((prev) => [...prev, `Successfully scraped ${data.count} products from the catalog.`].slice(-6));
      setStatus('completed');

      onComplete(data.products || []);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setStatus('idle');
        return;
      }
      
      const errorMsg = err instanceof Error ? err.message : "Scraping failed";
      setError(errorMsg);
      setStatus('error');
      setLogs((prev) => [...prev, `Error: ${errorMsg}`].slice(-6));
      
      toast({
        title: "Scraping Failed",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  const reset = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setStatus('idle');
    setProgress(0);
    setLogs([]);
    setFoundCount(0);
    setError(null);
    onClose();
  };

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && reset()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Scrape Product Data</DialogTitle>
          <DialogDescription>
            Extract real product information from viaglobalhealth.com
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {status === 'idle' ? (
            <div className="flex flex-col space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Product URLs (one per line)</label>
                <Textarea 
                  placeholder="https://viaglobalhealth.com/product/thermocoagulator/&#10;https://viaglobalhealth.com/product/another-product/&#10;..."
                  value={urls}
                  onChange={(e) => setUrls(e.target.value)}
                  className="min-h-[100px] font-mono text-sm"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Enter one URL per line. Each product will be scraped and saved to the database.
              </p>
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
                  {status === 'completed' ? 'Complete' : status === 'error' ? 'Failed' : status}
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
                  <span className="font-medium">{foundCount} products extracted and saved</span>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 p-4 bg-red-50 text-red-700 rounded-md border border-red-100 text-sm">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {status === 'idle' ? (
            <div className="flex w-full justify-between gap-3">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={startScrape}>Start Scraping</Button>
            </div>
          ) : status === 'completed' ? (
            <Button className="w-full" onClick={reset}>Done</Button>
          ) : status === 'error' ? (
            <div className="flex w-full gap-3">
              <Button variant="outline" className="flex-1" onClick={reset}>Close</Button>
              <Button className="flex-1" onClick={startScrape}>Try Again</Button>
            </div>
          ) : (
            <Button variant="destructive" className="w-full" onClick={reset}>Stop Scraping</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
