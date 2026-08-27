import { Link } from "react-router-dom";
import { X, LayoutDashboard } from "lucide-react";
import { SidebarCategory } from "./SidebarCategory";
import { SidebarFooter } from "./SidebarFooter";

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Background Overlay */}
      <div
        className="fixed inset-0 bg-overlay backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="fixed inset-y-0 left-0 flex w-full max-w-xs flex-col bg-card p-5 shadow-xl border-r border-border transition-transform animate-in slide-in-from-left duration-200 h-full overflow-hidden">
        {/* Locked Top */}
        <div className="shrink-0 flex items-center justify-between mb-3 pb-2 border-b border-border/40">
          <Link
            to="/dashboard"
            onClick={onClose}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-bold text-foreground hover:bg-muted transition-colors"
          >
            <LayoutDashboard className="h-4 w-4 text-primary" />
            <span>Dashboard</span>
          </Link>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Middle */}
        <div className="flex-1 overflow-y-auto min-h-0 pr-1 -mr-1">
          <SidebarCategory onNavigate={onClose} />
        </div>

        {/* Locked Bottom */}
        <div className="shrink-0 pt-2 mt-auto">
          <SidebarFooter onNavigate={onClose} />
        </div>
      </div>
    </div>
  );
}
