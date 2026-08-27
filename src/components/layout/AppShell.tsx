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
import { useTheme } from "@/components/theme/ThemeProvider";

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
  const { theme, setTheme } = useTheme();

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("ai_prompt_library_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  const toggleFullscreen = async () => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const win = getCurrentWindow();
      const isFull = await win.isFullscreen();
      await win.setFullscreen(!isFull);
    } catch {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const toggleAppTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
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

      // Ctrl + S: Save Prompt
      if (isCtrlOrMeta && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("app:save-prompt"));
        return;
      }

      // Ctrl + E: Edit Prompt / New Version
      if (isCtrlOrMeta && (e.key === "e" || e.key === "E")) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("app:edit-prompt"));
        return;
      }

      // F11: Toggle Fullscreen
      if (e.key === "F11") {
        e.preventDefault();
        toggleFullscreen();
        return;
      }

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
  }, [navigate, theme]);

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
              navigate("/prompts/new");
              break;
            case "save_prompt":
              window.dispatchEvent(new CustomEvent("app:save-prompt"));
              break;
            case "edit_prompt":
              window.dispatchEvent(new CustomEvent("app:edit-prompt"));
              break;
            case "quick_capture":
              setQuickCaptureOpen(true);
              break;
            case "open_library":
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
            case "toggle_fullscreen":
              toggleFullscreen();
              break;
            case "toggle_theme":
              toggleAppTheme();
              break;
            case "prompt_favorites":
              navigate("/prompts?favorite=true");
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
        }).then((unlisten) => {
          unlistenMenu = unlisten;
        });

        listen("open-documentation", async () => {
          try {
            const { openUrl } = await import("@tauri-apps/plugin-opener");
            await openUrl("https://github.com/bazistudio/ai-prompt-library-desktop#readme");
          } catch {
            window.open("https://github.com/bazistudio/ai-prompt-library-desktop#readme", "_blank", "noopener,noreferrer");
          }
        }).then((unlisten) => {
          unlistenDocs = unlisten;
        });

        listen("open-about", () => {
          setAboutModalOpen(true);
        }).then((unlisten) => {
          unlistenAbout = unlisten;
        });
      })
      .catch((err) => {
        console.warn("[AppShell] Tauri events unavailable in current runtime:", err);
      });

    return () => {
      if (unlistenMenu) unlistenMenu();
      if (unlistenDocs) unlistenDocs();
      if (unlistenAbout) unlistenAbout();
    };
  }, [navigate, theme]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground select-none">
      {/* Full-Screen Application Lock Screen Overlay */}
      <LockScreen />

      {/* Desktop Persistent Sidebar */}
      <div className="hidden md:flex shrink-0 h-full">
        <Sidebar
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />
      </div>

      {/* Mobile Drawer Sidebar */}
      <MobileSidebar
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main Workspace Frame */}
      <div className="flex flex-1 flex-col h-full min-w-0 overflow-hidden bg-background">
        {/* Top Navigation Bar */}
        <Navbar
          onMenuToggle={() => setMobileSidebarOpen(true)}
          onQuickCapture={() => setQuickCaptureOpen(true)}
          username={username}
          email={email}
        />

        {/* Dynamic Background Update Notification Banner */}
        <UpdateBanner />

        {/* Scrollable View Container */}
        <main className="flex-1 min-h-0 w-full overflow-y-auto bg-background/50">
          {children}
        </main>
      </div>

      {/* Modals */}
      <AboutModal
        isOpen={aboutModalOpen}
        onClose={() => setAboutModalOpen(false)}
      />

      <QuickCaptureModal
        isOpen={quickCaptureOpen}
        onClose={() => setQuickCaptureOpen(false)}
      />

      <KeyboardShortcutsModal
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />
    </div>
  );
}
