import * as React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { MobileSidebar } from "./MobileSidebar";
import { UpdateBanner } from "./UpdateBanner";
import { LockScreen } from "@/components/security/LockScreen";
import { AboutModal } from "@/components/modals/AboutModal";
import { QuickCaptureModal } from "@/components/quick-capture/QuickCaptureModal";
import { KeyboardShortcutsModal } from "@/components/modals/KeyboardShortcutsModal";
import { getStoragePath } from "@/services/storage/storageService";

interface AppShellProps {
  children: React.ReactNode;
  session?: {
    username: string;
    email: string;
  };
}

export function AppShell({ children, session }: AppShellProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("ai_prompt_library_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const navigate = useNavigate();

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("ai_prompt_library_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  const username = session?.username || "Developer";
  const email = session?.email || "developer@example.com";

  const focusNavbarSearch = () => {
    const searchInput = document.querySelector<HTMLInputElement>('input[placeholder*="Search prompts"]');
    searchInput?.focus();
  };

  // Global Canonical Keyboard Shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput =
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement ||
        (document.activeElement as HTMLElement)?.isContentEditable;

      const isCtrlOrMeta = e.ctrlKey || e.metaKey;

      // Ctrl + Shift + N: Quick Capture
      if (isCtrlOrMeta && e.shiftKey && (e.key === "N" || e.key === "n")) {
        e.preventDefault();
        setQuickCaptureOpen((prev) => !prev);
        return;
      }

      // Ctrl + N: New Prompt (when not typing in an active text field)
      if (isCtrlOrMeta && !e.shiftKey && (e.key === "n" || e.key === "N") && !isInput) {
        e.preventDefault();
        navigate("/prompts/new");
        return;
      }

      // Ctrl + O: Open Library
      if (isCtrlOrMeta && (e.key === "o" || e.key === "O") && !isInput) {
        e.preventDefault();
        navigate("/prompts");
        return;
      }

      // Ctrl + K: Focus Navbar Search Bar
      if (isCtrlOrMeta && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        focusNavbarSearch();
        return;
      }

      // Ctrl + B: Toggle Sidebar
      if (isCtrlOrMeta && (e.key === "b" || e.key === "B")) {
        e.preventDefault();
        toggleSidebar();
        return;
      }

      // Ctrl + ,: Settings
      if (isCtrlOrMeta && e.key === ",") {
        e.preventDefault();
        navigate("/settings");
        return;
      }

      // '?' or Ctrl + /: Keyboard Shortcuts Cheatsheet
      if (
        (isCtrlOrMeta && e.key === "/") ||
        (!isInput && e.key === "?")
      ) {
        e.preventDefault();
        setShortcutsModalOpen((prev) => !prev);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  // Listen to native desktop shell events from Tauri
  useEffect(() => {
    let unlistenMenu: (() => void) | undefined;
    let unlistenDocs: (() => void) | undefined;
    let unlistenAbout: (() => void) | undefined;

    import("@tauri-apps/api/event")
      .then(({ listen }) => {
        // Main Unified Menu Event Dispatcher
        listen<string>("menu-action", async (event) => {
          const action = event.payload;
          switch (action) {
            case "new_prompt":
            case "prompt_new":
              navigate("/prompts/new");
              break;
            case "quick_capture":
            case "prompt_quick_capture":
              setQuickCaptureOpen(true);
              break;
            case "open_library":
            case "view_library":
              navigate("/prompts");
              break;
            case "open_storage":
            case "tools_storage": {
              try {
                const path = await getStoragePath();
                if (path) {
                  const { invoke } = await import("@tauri-apps/api/core");
                  await invoke("open_in_file_manager", { path });
                } else {
                  navigate("/settings");
                }
              } catch {
                navigate("/settings");
              }
              break;
            }
            case "settings":
            case "view_settings":
            case "workspace_settings":
              navigate("/settings");
              break;
            case "view_dashboard":
              navigate("/dashboard");
              break;
            case "view_workflows":
              navigate("/workflows");
              break;
            case "command_palette":
            case "tools_search":
              focusNavbarSearch();
              break;
            case "toggle_sidebar":
              toggleSidebar();
              break;
            case "toggle_theme": {
              const isDark = document.documentElement.classList.contains("dark");
              if (isDark) {
                document.documentElement.classList.remove("dark");
                localStorage.setItem("theme", "light");
              } else {
                document.documentElement.classList.add("dark");
                localStorage.setItem("theme", "dark");
              }
              break;
            }
            case "prompt_favorites":
              navigate("/prompts?favorite=true");
              break;
            case "prompt_version_history":
              window.dispatchEvent(new CustomEvent("app:toggle-version-history"));
              break;
            case "prompt_delete":
              window.dispatchEvent(new CustomEvent("app:trigger-safe-delete-prompt"));
              break;
            case "workspace_switch":
            case "workspace_categories":
              navigate("/prompts");
              break;
            case "documentation":
              try {
                const { openUrl } = await import("@tauri-apps/plugin-opener");
                await openUrl("https://github.com/bazistudio/ai-prompt-library-desktop#readme");
              } catch {
                window.open("https://github.com/bazistudio/ai-prompt-library-desktop#readme", "_blank", "noopener,noreferrer");
              }
              break;
            case "shortcuts":
              setShortcutsModalOpen(true);
              break;
            case "check_updates":
              window.dispatchEvent(new CustomEvent("app:check-for-updates"));
              break;
            case "about":
              setAboutModalOpen(true);
              break;
            default:
              break;
          }
        }).then((unsub) => {
          unlistenMenu = unsub;
        });

        listen("open-documentation", async () => {
          try {
            const { openUrl } = await import("@tauri-apps/plugin-opener");
            await openUrl("https://github.com/bazistudio/ai-prompt-library-desktop#readme");
          } catch {
            window.open("https://github.com/bazistudio/ai-prompt-library-desktop#readme", "_blank", "noopener,noreferrer");
          }
        }).then((unsub) => {
          unlistenDocs = unsub;
        });

        listen("open-about-dialog", () => {
          setAboutModalOpen(true);
        }).then((unsub) => {
          unlistenAbout = unsub;
        });
      })
      .catch(() => {
        // Not in Tauri environment
      });

    return () => {
      if (unlistenMenu) unlistenMenu();
      if (unlistenDocs) unlistenDocs();
      if (unlistenAbout) unlistenAbout();
    };
  }, [navigate]);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Fullscreen Application Lock Overlay */}
      <LockScreen />

      {/* Background Update Notification Banner & Shell Center */}
      <UpdateBanner />

      {/* Top Navbar with integrated search bar & dropdown */}
      <Navbar
        onMenuToggle={() => setMobileSidebarOpen(true)}
        onQuickCapture={() => setQuickCaptureOpen(true)}
        username={username}
        email={email}
      />

      {/* Main Layout Area */}
      <div className="flex flex-1 relative w-full overflow-hidden">
        {/* Mobile Sidebar overlay */}
        <MobileSidebar
          isOpen={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
        />

        {/* Desktop Sidebar (Left) */}
        <Sidebar
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />

        {/* Scrollable Content (Center/Right) */}
        <main className="flex-1 overflow-y-auto h-[calc(100vh-65px)] relative">
          {children}
        </main>
      </div>

      {/* Global Keyboard Shortcuts Cheatsheet Modal */}
      <KeyboardShortcutsModal
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />

      {/* Global Quick Capture Modal */}
      <QuickCaptureModal
        isOpen={quickCaptureOpen}
        onClose={() => setQuickCaptureOpen(false)}
        onSuccess={(promptId) => {
          navigate(`/prompts/${promptId}`);
        }}
      />

      {/* Native About AI Prompt Library Modal */}
      <AboutModal
        isOpen={aboutModalOpen}
        onClose={() => setAboutModalOpen(false)}
        onCheckForUpdates={() => {
          window.dispatchEvent(new CustomEvent("app:check-for-updates"));
        }}
      />
    </div>
  );
}
