import { Link } from "react-router-dom";
import { Settings } from "lucide-react";

interface SidebarFooterProps {
  onNavigate?: () => void;
}

export function SidebarFooter({ onNavigate }: SidebarFooterProps) {
  return (
    <div className="flex flex-col border-t border-border/40 pt-1.5 px-0.5">
      <Link
        to="/settings"
        onClick={onNavigate}
        className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-left w-full cursor-pointer"
      >
        <Settings className="h-3.5 w-3.5" />
        <span>Settings</span>
      </Link>
    </div>
  );
}
