import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import HomePage from "@/pages/HomePage";
import AboutPage from "@/pages/AboutPage";
import PublicCatalog from "@/pages/PublicCatalog";
import QuoteRequestsPage from "@/pages/QuoteRequestsPage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/catalog" component={PublicCatalog} />
      <Route path="/about" component={AboutPage} />
      <Route path="/admin" component={Dashboard} />
      <Route path="/admin/quote-requests" component={QuoteRequestsPage} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
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