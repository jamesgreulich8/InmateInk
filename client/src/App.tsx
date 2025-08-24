import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Compose from "@/pages/compose";
import Checkout from "@/pages/checkout";
import Subscribe from "@/pages/subscribe";
import Admin from "@/pages/admin";
import Terms from "@/pages/terms";
import Privacy from "@/pages/privacy";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/compose" component={Compose} />
          <Route path="/checkout" component={Checkout} />
          <Route path="/subscribe" component={Subscribe} />
          <Route path="/admin" component={Admin} />
          <Route path="/terms" component={Terms} />
          <Route path="/privacy" component={Privacy} />
        </>
      )}
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
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
