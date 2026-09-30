import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SiteProvider } from "@/contexts/SiteContext";
import Home from "@/pages/Home";
import NotFound from "@/pages/NotFound";
import {
  AdminAuthProvider,
  useAdminAuth,
} from "@/pages/admin/AdminAuthContext";

// O painel só é baixado por quem abre /admin — o visitante do site não paga
// por esse código.
const AdminLogin = lazy(() => import("@/pages/admin/AdminLogin"));
const AdminContent = lazy(() => import("@/pages/admin/AdminContent"));
const AdminMedia = lazy(() => import("@/pages/admin/AdminMedia"));
const AdminLeads = lazy(() => import("@/pages/admin/AdminLeads"));
const AdminTheme = lazy(() => import("@/pages/admin/AdminTheme"));

function AdminGate() {
  const { user, checking } = useAdminAuth();

  if (checking) {
    return <div className="admin-booting">Verificando acesso…</div>;
  }

  if (!user) return <AdminLogin />;

  return (
    <Switch>
      <Route path="/admin" component={AdminContent} />
      <Route path="/admin/midia" component={AdminMedia} />
      <Route path="/admin/contatos" component={AdminLeads} />
      <Route path="/admin/tipografia" component={AdminTheme} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AdminRoutes() {
  return (
    <AdminAuthProvider>
      <Suspense
        fallback={<div className="admin-booting">Carregando painel…</div>}
      >
        <AdminGate />
      </Suspense>
    </AdminAuthProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <SiteProvider>
        <ThemeProvider defaultTheme="dark">
          <TooltipProvider>
            <Toaster theme="dark" />
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/admin/:rest*" component={AdminRoutes} />
              <Route path="/admin" component={AdminRoutes} />
              <Route component={NotFound} />
            </Switch>
          </TooltipProvider>
        </ThemeProvider>
      </SiteProvider>
    </ErrorBoundary>
  );
}

export default App;
