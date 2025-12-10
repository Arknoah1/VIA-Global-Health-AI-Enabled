import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

// Lazy load pages for code splitting
const HomePage = lazy(() => import("@/pages/HomePage"));
const PublicCatalog = lazy(() => import("@/pages/PublicCatalog"));
const AboutPage = lazy(() => import("@/pages/AboutPage"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const QuoteRequestsPage = lazy(() => import("@/pages/QuoteRequestsPage"));
const NotFound = lazy(() => import("@/pages/not-found"));

// Loading fallback component
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/catalog" component={PublicCatalog} />
        <Route path="/about" component={AboutPage} />
        <Route path="/admin" component={Dashboard} />
        <Route path="/admin/quote-requests" component={QuoteRequestsPage} />
        {/* Fallback to 404 */}
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;