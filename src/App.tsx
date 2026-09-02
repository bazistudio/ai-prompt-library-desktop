import React, { Suspense, lazy, useEffect, useState } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import AdminLayout from "@/app/(admin)/layout";
import { useAutoUpdater } from "@/hooks/useAutoUpdater";
import { UpdateNotificationModal } from "@/components/updater/UpdateNotificationModal";
import { runSQLiteMigration } from "@/services/migration/sqliteMigration";

// Dashboard Views (Loaded directly for instant offline startup)
import DashboardPage from "@/app/(dashboard)/dashboard/page";
import PromptsLibraryPage from "@/app/(dashboard)/prompts/page";
import CreatePromptPage from "@/app/(dashboard)/prompts/new/page";
import PromptDetailPage from "@/app/(dashboard)/prompts/[id]/page";
import WorkflowsPage from "@/app/(dashboard)/workflows/page";
import WorkflowDetailPage from "@/app/(dashboard)/workflows/[id]/page";
import TemplateLibraryPage from "@/app/(dashboard)/templates/page";
import ArenaPage from "@/app/(dashboard)/arena/page";
import SettingsPage from "@/app/(dashboard)/settings/page";

// Web / Online Pages (Lazy loaded so they don't bloat desktop bundle)
const Home = lazy(() => import("@/app/page"));
const LoginPage = lazy(() => import("@/app/(auth)/login/page"));
const RegisterPage = lazy(() => import("@/app/(auth)/register/page"));

const AdminDashboardPage = lazy(() => import("@/app/(admin)/admin/dashboard/page"));
const AdminUsersPage = lazy(() => import("@/app/(admin)/admin/users/page"));
const AdminSettingsPage = lazy(() => import("@/app/(admin)/admin/settings/page"));
const AdminLoginPage = lazy(() => import("@/app/(admin)/admin/login/page"));
const UnauthorizedPage = lazy(() => import("@/app/(admin)/admin/unauthorized/page"));

function DashboardLayoutWrapper() {
  return (
    <AppShell session={{ username: "Local Workspace", email: "developer@local" }}>
      <Outlet />
    </AppShell>
  );
}

function AdminLayoutWrapper() {
  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}

export function App() {
  const updater = useAutoUpdater();
  const [migrationStatus, setMigrationStatus] = useState<"INITIALIZING" | "MIGRATING" | "READY" | "ERROR">("INITIALIZING");

  useEffect(() => {
    async function initMigration() {
      if (updater.isTauri) {
        setMigrationStatus("MIGRATING");
        try {
          await runSQLiteMigration();
          setMigrationStatus("READY");
        } catch (e) {
          console.error("Migration failed", e);
          setMigrationStatus("ERROR");
        }
      } else {
        setMigrationStatus("READY");
      }
    }
    initMigration();
  }, [updater.isTauri]);

  if (migrationStatus === "INITIALIZING" || migrationStatus === "MIGRATING") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-sm text-muted-foreground">
        <div className="animate-pulse mb-4">Initializing Secure Local Database...</div>
        <div>Please wait while your workspace is prepared.</div>
      </div>
    );
  }

  if (migrationStatus === "ERROR") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-sm text-red-500">
        <div className="text-lg font-bold mb-2">Database Initialization Failed</div>
        <div className="mb-4 text-muted-foreground">Your existing library data has not been deleted.</div>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          Retry Initialization
        </button>
      </div>
    );
  }

  return (
    <>
      <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-xs text-muted-foreground">Loading Studio Workspace...</div>}>
        <Routes>
          {/* Root Route: Desktop goes directly to /dashboard, Web renders Landing Page */}
          <Route
            path="/"
            element={
              updater.isTauri ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Home />
              )
            }
          />

          {/* Auth Pages */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Main Studio Dashboard Layout */}
          <Route element={<DashboardLayoutWrapper />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/prompts" element={<PromptsLibraryPage />} />
            <Route path="/prompts/new" element={<CreatePromptPage />} />
            <Route path="/prompts/:id" element={<PromptDetailPage />} />
            <Route path="/workflows" element={<WorkflowsPage />} />
            <Route path="/workflows/:id" element={<WorkflowDetailPage />} />
            <Route path="/templates" element={<TemplateLibraryPage />} />
            <Route path="/arena" element={<ArenaPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/categories" element={<Navigate to="/prompts" replace />} />
          </Route>

          {/* Admin Layout */}
          <Route element={<AdminLayoutWrapper />}>
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/settings" element={<AdminSettingsPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin/unauthorized" element={<UnauthorizedPage />} />
          </Route>

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
      <UpdateNotificationModal updater={updater} />
    </>
  );
}

export default App;

