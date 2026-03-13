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
const ShippingEstimatorPage = lazy(() => import("@/pages/ShippingEstimatorPage"));
const AdminLoginPage = lazy(() => import("@/pages/AdminLoginPage"));
const ProductPage = lazy(() => import("@/pages/ProductPage"));
const PrivacyPolicyPage = lazy(() => import("@/pages/PrivacyPolicyPage"));
const ContactPage = lazy(() => import("@/pages/ContactPage"));
const ReturnPolicyPage = lazy(() => import("@/pages/ReturnPolicyPage"));
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

function AdminDashboardPage() {
  return <AdminGuard><Dashboard /></AdminGuard>;
}

function AdminQuoteRequestsPageWrapped() {
  return <AdminGuard><QuoteRequestsPage /></AdminGuard>;
}

function AdminPricingPageWrapped() {
  return <AdminGuard><ProductPricingPage /></AdminGuard>;
}

function AdminTrainingPageWrapped() {
  return <AdminGuard><TrainingTranscriptsPage /></AdminGuard>;
}

function AdminShippingPageWrapped() {
  return <AdminGuard><ShippingEstimatorPage /></AdminGuard>;
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/catalog" component={PublicCatalog} />
        <Route path="/products/:slug" component={ProductPage} />
        <Route path="/about" component={AboutPage} />
        <Route path="/track-quote" component={QuoteTrackingPage} />
        <Route path="/privacy-policy" component={PrivacyPolicyPage} />
        <Route path="/contact" component={ContactPage} />
        <Route path="/return-policy" component={ReturnPolicyPage} />
        <Route path="/admin/quote-requests" component={AdminQuoteRequestsPageWrapped} />
        <Route path="/admin/pricing" component={AdminPricingPageWrapped} />
        <Route path="/admin/training" component={AdminTrainingPageWrapped} />
        <Route path="/admin/shipping" component={AdminShippingPageWrapped} />
        <Route path="/admin" component={AdminDashboardPage} />
        <Route path="/" component={HomePage} />
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
