import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { LanguageProvider } from "@/i18n/LanguageProvider";

const HomePage = lazy(() => import("@/pages/HomePage"));
const PublicCatalog = lazy(() => import("@/pages/PublicCatalog"));
const AboutPage = lazy(() => import("@/pages/AboutPage"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const QuoteRequestsPage = lazy(() => import("@/pages/QuoteRequestsPage"));
const QuoteTrackingPage = lazy(() => import("@/pages/QuoteTrackingPage"));
const ProductPricingPage = lazy(() => import("@/pages/ProductPricingPage"));
const TrainingTranscriptsPage = lazy(() => import("@/pages/TrainingTranscriptsPage"));
const AdminLoginPage = lazy(() => import("@/pages/AdminLoginPage"));
const NotFound = lazy(() => import("@/pages/not-found"));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-auth"],
    queryFn: async () => {
      const res = await fetch("/api/admin/check");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  if (isLoading) return <PageLoader />;

  if (!data?.authenticated) {
    return (
      <AdminLoginPage
        onLogin={() => {
          queryClient.invalidateQueries({ queryKey: ["admin-auth"] });
        }}
      />
    );
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/catalog" component={PublicCatalog} />
        <Route path="/about" component={AboutPage} />
        <Route path="/track-quote" component={QuoteTrackingPage} />
        <Route path="/admin">
          <AdminGuard><Dashboard /></AdminGuard>
        </Route>
        <Route path="/admin/quote-requests">
          <AdminGuard><QuoteRequestsPage /></AdminGuard>
        </Route>
        <Route path="/admin/pricing">
          <AdminGuard><ProductPricingPage /></AdminGuard>
        </Route>
        <Route path="/admin/training">
          <AdminGuard><TrainingTranscriptsPage /></AdminGuard>
        </Route>
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
