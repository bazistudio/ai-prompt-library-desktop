import React from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import AdminLayout from "@/app/(admin)/layout";

// Views / Pages
import Home from "@/app/page";
import LoginPage from "@/app/(auth)/login/page";
import RegisterPage from "@/app/(auth)/register/page";
import DashboardPage from "@/app/(dashboard)/dashboard/page";
import PromptsLibraryPage from "@/app/(dashboard)/prompts/page";
import CreatePromptPage from "@/app/(dashboard)/prompts/new/page";
import PromptDetailPage from "@/app/(dashboard)/prompts/[id]/page";
import WorkflowsPage from "@/app/(dashboard)/workflows/page";
import WorkflowDetailPage from "@/app/(dashboard)/workflows/[id]/page";
import TemplateLibraryPage from "@/app/(dashboard)/templates/page";
import ArenaPage from "@/app/(dashboard)/arena/page";
import SettingsPage from "@/app/(dashboard)/settings/page";

import AdminDashboardPage from "@/app/(admin)/admin/dashboard/page";
import AdminUsersPage from "@/app/(admin)/admin/users/page";
import AdminSettingsPage from "@/app/(admin)/admin/settings/page";
import AdminLoginPage from "@/app/(admin)/admin/login/page";
import UnauthorizedPage from "@/app/(admin)/admin/unauthorized/page";

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
  return (
    <Routes>
      {/* Landing Page */}
      <Route path="/" element={<Home />} />

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
  );
}

export default App;
