import { Link, useLocation, useSearchParams } from "react-router-dom";
import {
  LayoutDashboard,
  Library,
  Workflow,
  Star,
  Settings,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import { SidebarCategory } from "./SidebarCategory";
import { SidebarFooter } from "./SidebarFooter";

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const isFavorites = searchParams.get("favorite") === "true";

  if (isCollapsed) {
    return (
      <aside className="w-[68px] border-r border-border bg-card py-3 px-2 hidden md:flex flex-col items-center justify-between h-[calc(100vh-65px)] sticky top-[65px] shrink-0 z-30 transition-all duration-200">
        {/* Top: Expand Toggle & Quick Actions */}
        <div className="w-full flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Expand Sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Quick Add Prompt */}
          <Link
            to="/prompts/new"
            className="h-9 w-9 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 flex items-center justify-center transition-colors shadow-xs"
            title="New Prompt"
          >
            <Plus className="h-4 w-4" />
          </Link>

          <div className="w-8 h-[1px] bg-border/60 my-1" />

          {/* Core Navigation Icons */}
          <div className="flex flex-col items-center gap-1.5 w-full">
            <Link
              to="/dashboard"
              className={`h-9 w-9 rounded-xl flex items-center justify-center transition-colors ${
                pathname === "/dashboard"
                  ? "bg-primary text-primary-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              title="Dashboard"
            >
              <LayoutDashboard className="h-4 w-4" />
            </Link>

            <Link
              to="/prompts"
              className={`h-9 w-9 rounded-xl flex items-center justify-center transition-colors ${
                pathname === "/prompts" && !isFavorites
                  ? "bg-primary text-primary-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              title="My Library"
            >
              <Library className="h-4 w-4" />
            </Link>

            <Link
              to="/workflows"
              className={`h-9 w-9 rounded-xl flex items-center justify-center transition-colors ${
                pathname.startsWith("/workflows")
                  ? "bg-primary text-primary-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              title="Workflows"
            >
              <Workflow className="h-4 w-4" />
            </Link>

            <Link
              to="/prompts?favorite=true"
              className={`h-9 w-9 rounded-xl flex items-center justify-center transition-colors ${
                isFavorites
                  ? "bg-accent/20 text-accent font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              title="Favorites"
            >
              <Star className="h-4 w-4 text-accent fill-accent/20" />
            </Link>
          </div>
        </div>

        {/* Bottom: Settings */}
        <div className="w-full flex flex-col items-center gap-2 pt-3 border-t border-border">
          <Link
            to="/settings"
            className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </Link>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-64 border-r border-border bg-card p-4 hidden md:flex flex-col h-[calc(100vh-65px)] sticky top-[65px] shrink-0 overflow-y-auto z-30 transition-all duration-200">
      {/* Sidebar Top Collapse Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/40">
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          Workspace
        </span>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Collapse Sidebar"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      <SidebarCategory />
      <SidebarFooter />
    </aside>
  );
}
