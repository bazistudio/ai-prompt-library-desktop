import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Terminal,
  Home,
  Search,
  Sun,
  Moon,
  UserCircle,
  Menu,
  PlusCircle,
  Zap,
  Lock,
  Loader2,
  X,
  Settings,
  Shield,
  Camera,
} from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { NavbarSearchBar } from "@/components/layout/NavbarSearchBar";

interface NavbarProps {
  onMenuToggle: () => void;
  onQuickCapture?: () => void;
  username: string;
  email: string;
}

export function Navbar({
  onMenuToggle,
  onQuickCapture,
  username: initialUsername,
  email: initialEmail,
}: NavbarProps) {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [locking, setLocking] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Profile data from storage or props
  const [userProfile, setUserProfile] = useState<{ username: string; email: string }>(() => {
    try {
      const stored = localStorage.getItem("ai_prompt_library_user_profile");
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return { username: initialUsername || "Developer", email: initialEmail || "developer@example.com" };
  });

  const [userAvatar, setUserAvatar] = useState<string | null>(() => {
    try {
      return localStorage.getItem("ai_prompt_library_user_avatar");
    } catch {
      return null;
    }
  });

  // Listen to profile avatar & info updates in real-time
  useEffect(() => {
    const handleAvatarUpdate = (e: any) => {
      try {
        const customUrl = e?.detail ?? localStorage.getItem("ai_prompt_library_user_avatar");
        setUserAvatar(customUrl || null);
      } catch {
        setUserAvatar(null);
      }
    };

    const handleProfileUpdate = (e: any) => {
      try {
        const updated = e?.detail || JSON.parse(localStorage.getItem("ai_prompt_library_user_profile") || "{}");
        if (updated.username || updated.email) {
          setUserProfile((prev) => ({
            username: updated.username || prev.username,
            email: updated.email || prev.email,
          }));
        }
      } catch {}
    };

    window.addEventListener("user-avatar-updated", handleAvatarUpdate);
    window.addEventListener("app:user-profile-updated", handleProfileUpdate);
    window.addEventListener("storage", handleAvatarUpdate);
    window.addEventListener("storage", handleProfileUpdate);

    return () => {
      window.removeEventListener("user-avatar-updated", handleAvatarUpdate);
      window.removeEventListener("app:user-profile-updated", handleProfileUpdate);
      window.removeEventListener("storage", handleAvatarUpdate);
      window.removeEventListener("storage", handleProfileUpdate);
    };
  }, []);

  const handleLockAction = async () => {
    setLocking(true);
    try {
      // 1. Check Electron native security if active
      if (typeof window !== "undefined" && window.electronAPI?.security) {
        const secStatus = await window.electronAPI.security.getStatus();
        if (secStatus && (secStatus.hasPassword || secStatus.hasPin)) {
          await window.electronAPI.security.toggleLock(true);
          window.dispatchEvent(new CustomEvent("app:lock-state-changed"));
          return;
        }
      }

      // 2. Check local storage security
      const hasLocalPass =
        typeof window !== "undefined" &&
        Boolean(
          localStorage.getItem("appLockPasswordHash") ||
          localStorage.getItem("appLockPassword") ||
          localStorage.getItem("appLockPasswordPlain")
        );
      const hasLocalPin =
        typeof window !== "undefined" &&
        Boolean(
          localStorage.getItem("appLockPinHash") ||
          localStorage.getItem("appLockPin") ||
          localStorage.getItem("appLockPinPlain")
        );

      if (hasLocalPass || hasLocalPin) {
        localStorage.setItem("ai_prompt_library_is_locked", "true");
        window.dispatchEvent(new CustomEvent("app:lock-state-changed"));
      } else {
        // If no lock credential is configured yet, guide user straight to Settings -> Account/Security
        setShowProfileModal(false);
        navigate("/settings?tab=account");
      }
    } catch (err) {
      console.error("Lock trigger error:", err);
      navigate("/settings?tab=account");
    } finally {
      setLocking(false);
    }
  };

  return (
    <>
      <header className="glass-card sticky top-0 z-40 px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 flex items-center justify-between h-[65px] w-full border-b border-border bg-card/80 backdrop-blur-md">
        {/* Left side */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
          {/* Mobile Hamburger */}
          <button
            onClick={onMenuToggle}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground md:hidden cursor-pointer shrink-0 transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Brand Logo & Title */}
          <Link to="/dashboard" className="flex items-center gap-2.5 shrink-0 group">
            <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden p-1 shadow-sm group-hover:border-primary/40 transition-all shrink-0">
              <img
                src="/images/logo.png"
                alt="AI Prompt Library Logo"
                width={26}
                height={26}
                className="object-contain"
                onError={(e) => {
                  const target = e.target as HTMLElement;
                  target.style.display = "none";
                  const fallback = target.parentElement?.querySelector(".logo-fallback") as HTMLElement;
                  if (fallback) fallback.style.display = "flex";
                }}
              />
              <div className="logo-fallback hidden h-full w-full items-center justify-center bg-primary text-primary-foreground rounded-lg">
                <Terminal className="h-4 w-4" />
              </div>
            </div>
            <span className="font-semibold text-sm md:text-base tracking-tight text-foreground group-hover:text-primary transition-colors hidden sm:inline truncate">
              AI Prompt Library
            </span>
          </Link>

          {/* Vertical Separator */}
          <div className="h-4 w-[1px] bg-border hidden lg:block mx-1.5" />

          {/* Navigation Link */}
          <Link
            to="/dashboard"
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          >
            <Home className="h-3.5 w-3.5" />
            <span>Prompt Home</span>
          </Link>
        </div>

        {/* Center Search (Direct Inline Input & Results Dropdown) */}
        <div className="flex-1 max-w-sm lg:max-w-md mx-2 lg:mx-4 hidden md:flex justify-center">
          <NavbarSearchBar />
        </div>

        {/* Right side */}
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-2.5 shrink-0">
          {/* Quick Capture Button */}
          <button
            type="button"
            onClick={onQuickCapture}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 transition-colors shadow-2xs cursor-pointer shrink-0"
            title="Quick Capture Prompt (Ctrl+Shift+N)"
          >
            <Zap className="h-3.5 w-3.5 fill-amber-500/30" />
            <span className="hidden md:inline">Quick Capture</span>
          </button>

          {/* New Prompt Button */}
          <Link
            to="/prompts/new"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm shrink-0"
          >
            <PlusCircle className="h-4 w-4" />
            <span className="hidden sm:inline">New Prompt</span>
          </Link>

          {/* Mobile Search Icon */}
          <button
            onClick={() => {
              const input = document.querySelector<HTMLInputElement>('input[placeholder*="Search prompts"]');
              input?.focus();
            }}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground md:hidden cursor-pointer shrink-0"
            title="Search prompts by title, category, tags"
          >
            <Search className="h-4.5 w-4.5" />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer shrink-0"
            title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          >
            {theme === "dark" ? (
              <Sun className="h-4.5 w-4.5 text-accent" />
            ) : (
              <Moon className="h-4.5 w-4.5 text-primary" />
            )}
          </button>

          {/* App Lock Button */}
          <button
            type="button"
            onClick={handleLockAction}
            disabled={locking}
            className="p-1.5 rounded-lg border border-border/60 bg-card/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer flex items-center justify-center shrink-0"
            title="Lock Application (or set PIN/Password in Settings)"
            aria-label="Lock Application"
          >
            {locking ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <Lock className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
            )}
          </button>

          {/* User Profile Avatar Button (Opens 200x200 preview modal) */}
          <button
            type="button"
            onClick={() => setShowProfileModal(true)}
            className="flex items-center p-0.5 rounded-full hover:ring-2 hover:ring-primary/40 transition-all cursor-pointer shrink-0 group"
            title={`Profile (${userProfile.username}) — View Profile`}
            aria-label="User Profile"
          >
            <div className="h-7 w-7 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary overflow-hidden shadow-2xs">
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt="Profile Avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserCircle className="h-5 w-5 text-accent group-hover:scale-105 transition-transform" />
              )}
            </div>
          </button>
        </div>
      </header>

      {/* 200x200 Profile Photo & Account Preview Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="glass-card max-w-sm w-full p-6 rounded-3xl border border-primary/20 shadow-2xl bg-card flex flex-col items-center text-center relative overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Close button */}
            <button
              onClick={() => setShowProfileModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            {/* 200x200 Pixel Big Size Profile Image */}
            <div className="w-[200px] h-[200px] rounded-2xl bg-primary/10 border-2 border-primary/30 flex items-center justify-center text-primary overflow-hidden shadow-lg mb-4 relative group">
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt="Profile Avatar 200x200"
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserCircle className="w-24 h-24 text-primary/70" />
              )}
            </div>

            {/* User Details */}
            <h3 className="text-lg font-bold text-foreground mb-0.5">
              {userProfile.username}
            </h3>
            <p className="text-xs text-muted-foreground mb-3 font-mono">
              {userProfile.email}
            </p>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-status-online text-status-online-foreground text-[11px] font-semibold mb-5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Active Workspace Session</span>
            </div>

            {/* Action Buttons */}
            <div className="w-full space-y-2">
              <button
                type="button"
                onClick={() => {
                  setShowProfileModal(false);
                  navigate("/settings?tab=account");
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Settings className="h-4 w-4" />
                <span>Account & Photo Settings</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowProfileModal(false);
                  handleLockAction();
                }}
                className="w-full py-2.5 px-4 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Lock Application</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
