import React from "react";
import { Sparkles, ArrowRight, X, RefreshCw, CheckCircle2 } from "lucide-react";
import { AutoUpdaterState } from "@/hooks/useAutoUpdater";

interface UpdateNotificationModalProps {
  updater: AutoUpdaterState;
}

export const UpdateNotificationModal: React.FC<UpdateNotificationModalProps> = ({ updater }) => {
  if (!updater.isModalOpen || !updater.availableVersion) {
    return null;
  }

  const isInstalling = updater.status === "installing";

  return (
    <div
      className="fixed bottom-6 right-6 z-50 max-w-md w-full p-5 rounded-2xl bg-card/95 backdrop-blur-xl border border-primary/30 shadow-2xl shadow-primary/10 text-foreground animate-in slide-in-from-bottom-5 duration-300"
      role="dialog"
      aria-labelledby="update-modal-title"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary flex-shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 id="update-modal-title" className="text-sm font-bold tracking-tight text-foreground">
              Update Ready to Install
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              AI Prompt Library v{updater.availableVersion} has been downloaded.
            </p>
          </div>
        </div>

        <button
          onClick={updater.dismissModal}
          disabled={isInstalling}
          className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-50 cursor-pointer"
          title="Dismiss"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Version Comparison Card */}
      <div className="mt-4 p-3 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between text-xs">
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Installed</span>
          <span className="font-mono font-medium text-foreground">v{updater.currentVersion}</span>
        </div>
        <div className="flex items-center text-primary px-2">
          <ArrowRight className="h-4 w-4" />
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-primary uppercase font-semibold tracking-wider">New Ready</span>
          <span className="font-mono font-bold text-primary">v{updater.availableVersion}</span>
        </div>
      </div>

      {/* Download Completion Bar */}
      <div className="mt-3 space-y-1">
        <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
          <span className="flex items-center gap-1 text-emerald-500 font-semibold">
            <CheckCircle2 className="h-3 w-3" /> Download Complete
          </span>
          <span>100%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all duration-300 w-full" />
        </div>
      </div>

      {/* Release Notes snippet if available */}
      {updater.releaseNotes && (
        <div className="mt-3 max-h-24 overflow-y-auto rounded-lg bg-background/50 border border-border/40 p-2.5 text-[11px] text-muted-foreground font-mono leading-relaxed select-text">
          <div className="whitespace-pre-wrap">{updater.releaseNotes}</div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-4 flex items-center justify-end gap-2.5">
        <button
          type="button"
          onClick={updater.dismissModal}
          disabled={isInstalling}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-border bg-background hover:bg-muted text-foreground transition-all cursor-pointer disabled:opacity-50"
          title="Install on Next Launch"
        >
          Install on Next Launch
        </button>

        <button
          type="button"
          onClick={() => updater.installNow()}
          disabled={isInstalling}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs transition-all shadow-md shadow-primary/20 cursor-pointer disabled:opacity-75"
        >
          {isInstalling ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>Installing...</span>
            </>
          ) : (
            <>
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Install Now</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

