import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Loader2 } from "lucide-react";

export function LogoutButton() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleLockAction = async () => {
    setLoading(true);
    try {
      if (typeof window !== "undefined" && window.electronAPI?.security) {
        const secStatus = await window.electronAPI.security.getStatus();
        if (secStatus && (secStatus.hasPassword || secStatus.hasPin)) {
          await window.electronAPI.security.toggleLock(true);
          window.location.reload();
          return;
        }
      }

      // Check local storage security configurations
      const hasLocalLock =
        typeof window !== "undefined" &&
        (localStorage.getItem("appLockPasswordHash") ||
          localStorage.getItem("appLockPinHash") ||
          localStorage.getItem("ai_prompt_library_lock_enabled") === "true");

      if (hasLocalLock) {
        // Trigger lock state
        window.location.reload();
      } else {
        // No lock credentials configured: Guide user to Settings -> Account/Security
        navigate("/settings");
      }
    } catch (err) {
      console.error("Lock action failed:", err);
      navigate("/settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLockAction}
      disabled={loading}
      className="p-2 rounded-xl border border-border/60 bg-card/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer flex items-center justify-center shrink-0"
      title="Lock Workspace (Click to lock or configure PIN/Password in Settings)"
      aria-label="Lock Application"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      ) : (
        <Lock className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
      )}
    </button>
  );
}

export const LockAppButton = LogoutButton;

