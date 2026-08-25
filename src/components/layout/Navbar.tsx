import { Link } from "react-router-dom";
import { Terminal, Home, Search, Sun, Moon, UserCircle, Menu, PlusCircle, Zap, ChevronLeft, ChevronRight } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { LogoutButton } from "@/components/ui/LogoutButton";

interface NavbarProps {
  onMenuToggle: () => void;
  onQuickCapture?: () => void;
  onOpenCommandPalette?: () => void;
  onToggleSidebarCollapse?: () => void;
  isSidebarCollapsed?: boolean;
  username: string;
  email: string;
}

export function Navbar({
  onMenuToggle,
  onQuickCapture,
  onOpenCommandPalette,
  onToggleSidebarCollapse,
  isSidebarCollapsed = false,
  username,
  email,
}: NavbarProps) {
  const { theme, setTheme } = useTheme();

  return (
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

        {/* Desktop Sidebar Collapse Toggle */}
        <button
          type="button"
          onClick={onToggleSidebarCollapse}
          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground hidden md:flex items-center justify-center cursor-pointer shrink-0 transition-colors"
          title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>

        {/* Brand Logo & Title */}
        <Link to="/dashboard" className="flex items-center gap-2 shrink-0">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
            <Terminal className="h-4.5 w-4.5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm md:text-base tracking-tight text-foreground hidden sm:inline truncate">
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

      {/* Center Search (Interactive Command Palette Trigger) */}
      <div className="flex-1 max-w-xs lg:max-w-sm mx-2 lg:mx-4 hidden md:block">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="w-full flex items-center justify-between px-3 py-1.5 sm:py-2 rounded-lg border border-border bg-card/60 hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-2xs group"
          title="Search prompts or jump to actions (⌘K)"
        >
          <div className="flex items-center gap-2.5 truncate">
            <Search className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            <span className="text-xs truncate">Search prompts & actions...</span>
          </div>
          <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-medium text-muted-foreground bg-muted border border-border rounded shrink-0">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 shrink-0">
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
          onClick={onOpenCommandPalette}
          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground md:hidden cursor-pointer shrink-0"
          title="Search prompts & actions"
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

        {/* Profile indicator */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <div className="h-7 w-7 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
            <UserCircle className="h-4.5 w-4.5 text-accent" />
          </div>
        </div>

        {/* Logout */}
        <div className="shrink-0">
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
