import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Brain, Trash2, Eye, Search, FileText, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";

interface TrainingTranscript {
  id: string;
  title: string;
  rawTranscript: string;
  annotations: string | null;
  buyerType: string | null;
  country: string | null;
  productsDiscussed: string | null;
  objections: string | null;
  outcome: string | null;
  aiExtractedInsights: any;
  isProcessed: boolean;
  createdAt: string;
  updatedAt: string;
}

function OutcomeBadge({ outcome }: { outcome: string | null }) {
  if (!outcome) return <Badge variant="outline">Not analyzed</Badge>;
  const colors: Record<string, string> = {
    sale: "bg-green-100 text-green-800",
    no_sale: "bg-red-100 text-red-800",
    pending: "bg-yellow-100 text-yellow-800",
    referred: "bg-blue-100 text-blue-800",
  };
  return (
    <Badge className={colors[outcome] || "bg-gray-100 text-gray-800"}>
      {outcome.replace("_", " ")}
    </Badge>
  );
}

function TranscriptForm({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [rawTranscript, setRawTranscript] = useState("");
  const [annotations, setAnnotations] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; rawTranscript: string; annotations?: string }) => {
      const res = await fetch("/api/training-transcripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save transcript");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-transcripts"] });
      toast({ title: "Transcript saved", description: "You can now process it with AI to extract insights." });
      onClose();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save transcript", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium" htmlFor="transcript-title">Title</label>
        <Input
          id="transcript-title"
          data-testid="input-transcript-title"
          placeholder="e.g., Nigeria distributor - ventilator inquiry"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div>
        <label className="text-sm font-medium" htmlFor="transcript-content">Chat Log</label>
        <Textarea
          id="transcript-content"
          data-testid="input-transcript-content"
          placeholder="Paste the conversation transcript here..."
          value={rawTranscript}
          onChange={(e) => setRawTranscript(e.target.value)}
          rows={12}
          className="font-mono text-sm"
        />
      </div>
      <div>
        <label className="text-sm font-medium" htmlFor="transcript-annotations">Your Notes & Annotations (optional)</label>
        <Textarea
          id="transcript-annotations"
          data-testid="input-transcript-annotations"
          placeholder="Add your commentary here... e.g., 'Customer was price-sensitive, should have offered NGO discount earlier'"
          value={annotations}
          onChange={(e) => setAnnotations(e.target.value)}
          rows={4}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} data-testid="button-cancel-transcript">Cancel</Button>
        <Button
          data-testid="button-save-transcript"
          onClick={() => createMutation.mutate({ title, rawTranscript, annotations: annotations || undefined })}
          disabled={!title.trim() || !rawTranscript.trim() || createMutation.isPending}
        >
          {createMutation.isPending ? "Saving..." : "Save Transcript"}
        </Button>
      </div>
    </div>
  );
}

function TranscriptDetail({ transcript, onClose }: { transcript: TrainingTranscript; onClose: () => void }) {
  const [annotations, setAnnotations] = useState(transcript.annotations || "");
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async (data: { annotations: string }) => {
      const res = await fetch(`/api/training-transcripts/${transcript.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-transcripts"] });
      toast({ title: "Annotations saved" });
      setIsEditing(false);
    },
  });

  const processMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/training-transcripts/${transcript.id}/process`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to process");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-transcripts"] });
      toast({ title: "AI analysis complete", description: "Insights have been extracted from the transcript." });
      onClose();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to process transcript with AI", variant: "destructive" });
    },
  });

  const insights = transcript.aiExtractedInsights as any;

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{transcript.title}</h3>
        <OutcomeBadge outcome={transcript.outcome} />
      </div>

      {transcript.isProcessed && insights && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="h-4 w-4" />
              AI-Extracted Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {transcript.buyerType && <p><strong>Buyer Type:</strong> {transcript.buyerType}</p>}
            {transcript.country && <p><strong>Country:</strong> {transcript.country}</p>}
            {transcript.productsDiscussed && <p><strong>Products:</strong> {transcript.productsDiscussed}</p>}
            {transcript.objections && <p><strong>Objections:</strong> {transcript.objections}</p>}
            {insights.keyPatterns?.length > 0 && (
              <div>
                <strong>Key Patterns:</strong>
                <div className="flex flex-wrap gap-1 mt-1">
                  {insights.keyPatterns.map((p: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-xs">{p}</Badge>
                  ))}
                </div>
              </div>
            )}
            {insights.suggestedResponses?.length > 0 && (
              <div>
                <strong>Suggested Responses:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  {insights.suggestedResponses.map((r: string, i: number) => (
                    <li key={i} className="text-xs">{r}</li>
                  ))}
                </ul>
              </div>
            )}
            {insights.lessonsLearned && (
              <div>
                <strong>Lessons Learned:</strong>
                <p className="mt-1 text-muted-foreground">{insights.lessonsLearned}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div>
        <label className="text-sm font-medium">Chat Transcript</label>
        <div className="mt-1 p-3 bg-muted rounded-md max-h-60 overflow-y-auto">
          <pre className="whitespace-pre-wrap text-sm font-mono">{transcript.rawTranscript}</pre>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Your Annotations</label>
          {!isEditing && (
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} data-testid="button-edit-annotations">
              Edit
            </Button>
          )}
        </div>
        {isEditing ? (
          <div className="mt-1 space-y-2">
            <Textarea
              data-testid="input-edit-annotations"
              value={annotations}
              onChange={(e) => setAnnotations(e.target.value)}
              rows={4}
              placeholder="Add your notes and commentary..."
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                data-testid="button-save-annotations"
                onClick={() => updateMutation.mutate({ annotations })}
                disabled={updateMutation.isPending}
              >
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setIsEditing(false); setAnnotations(transcript.annotations || ""); }}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            {transcript.annotations || "No annotations yet. Click edit to add your notes."}
          </p>
        )}
      </div>

      <div className="flex justify-between pt-2 border-t">
        <Button
          data-testid="button-process-ai"
          onClick={() => processMutation.mutate()}
          disabled={processMutation.isPending}
          className="gap-2"
        >
          <Brain className="h-4 w-4" />
          {processMutation.isPending ? "Analyzing..." : transcript.isProcessed ? "Re-analyze with AI" : "Analyze with AI"}
        </Button>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}

export default function TrainingTranscriptsPage() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedTranscript, setSelectedTranscript] = useState<TrainingTranscript | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOutcome, setFilterOutcome] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: transcripts = [], isLoading } = useQuery<TrainingTranscript[]>({
    queryKey: ["training-transcripts"],
    queryFn: async () => {
      const res = await fetch("/api/training-transcripts");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/training-transcripts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-transcripts"] });
      toast({ title: "Transcript deleted" });
    },
  });

  const filtered = transcripts.filter((t) => {
    const matchesSearch = !searchQuery ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.buyerType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.country?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.productsDiscussed?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesOutcome = filterOutcome === "all" || t.outcome === filterOutcome || (!t.outcome && filterOutcome === "unprocessed");
    return matchesSearch && matchesOutcome;
  });

  const processedCount = transcripts.filter(t => t.isProcessed).length;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-6 md:p-8 max-w-6xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Training Transcripts</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Teach the AI from real conversations. {processedCount} of {transcripts.length} analyzed.
              </p>
            </div>
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" data-testid="button-add-transcript">
                  <Plus className="h-4 w-4" />
                  Add Transcript
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add Training Transcript</DialogTitle>
                  <DialogDescription className="sr-only">Upload a new training conversation transcript for AI analysis</DialogDescription>
                </DialogHeader>
                <TranscriptForm onClose={() => setIsAddOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                data-testid="input-search-transcripts"
                placeholder="Search by title, buyer type, country, or product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterOutcome} onValueChange={setFilterOutcome}>
              <SelectTrigger className="w-[180px]" data-testid="select-filter-outcome">
                <SelectValue placeholder="Filter by outcome" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unprocessed">Not analyzed</SelectItem>
                <SelectItem value="sale">Sale</SelectItem>
                <SelectItem value="no_sale">No Sale</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="referred">Referred</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading transcripts...</div>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {transcripts.length === 0 ? "No training transcripts yet" : "No matching transcripts"}
                </h3>
                <p className="text-muted-foreground text-sm max-w-md">
                  {transcripts.length === 0
                    ? "Paste in chat logs from real customer conversations so the AI can learn from your experience."
                    : "Try adjusting your search or filter."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((t) => (
                <Card key={t.id} className="hover:shadow-md transition-shadow" data-testid={`card-transcript-${t.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium truncate">{t.title}</h3>
                          <OutcomeBadge outcome={t.outcome} />
                          {t.isProcessed && (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                              <Brain className="h-3 w-3 mr-1" />
                              Analyzed
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {t.buyerType && <span>Buyer: {t.buyerType}</span>}
                          {t.country && <span>Country: {t.country}</span>}
                          {t.productsDiscussed && <span>Products: {t.productsDiscussed}</span>}
                          <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                        </div>
                        {t.annotations && (
                          <p className="text-xs text-muted-foreground mt-1 italic line-clamp-1">
                            Notes: {t.annotations}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          data-testid={`button-view-transcript-${t.id}`}
                          onClick={() => setSelectedTranscript(t)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-delete-transcript-${t.id}`}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete transcript?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove this training transcript and its insights.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(t.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Dialog open={!!selectedTranscript} onOpenChange={(open) => !open && setSelectedTranscript(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Transcript Details</DialogTitle>
            <DialogDescription className="sr-only">View transcript content and AI-extracted insights</DialogDescription>
          </DialogHeader>
          {selectedTranscript && (
            <TranscriptDetail
              transcript={selectedTranscript}
              onClose={() => setSelectedTranscript(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}