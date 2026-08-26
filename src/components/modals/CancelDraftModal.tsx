import React from "react";
import { AlertCircle, FileText, Trash2, X } from "lucide-react";

interface CancelDraftModalProps {
  isOpen: boolean;
  onKeepEditing: () => void;
  onSaveDraft: () => void;
  onDiscard: () => void;
}

export const CancelDraftModal: React.FC<CancelDraftModalProps> = ({
  isOpen,
  onKeepEditing,
  onSaveDraft,
  onDiscard,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-modal-title"
    >
      <div className="relative w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-5 text-left animate-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 id="cancel-modal-title" className="text-base font-bold text-foreground">
                Discard this prompt?
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                You have unsaved prompt content.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onKeepEditing}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed bg-muted/30 p-3 rounded-xl border border-border/50">
          You can keep editing, save your work as a temporary in-memory draft to resume later, or discard your unsaved changes.
        </p>

        <div className="flex flex-col gap-2.5 pt-1">
          <button
            type="button"
            onClick={onKeepEditing}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs transition-all shadow-md shadow-primary/20 cursor-pointer"
          >
            <span>Keep Editing</span>
          </button>

          <button
            type="button"
            onClick={onSaveDraft}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground font-semibold text-xs transition-colors cursor-pointer"
          >
            <FileText className="h-4 w-4 text-primary" />
            <span>Save as Temporary Draft</span>
          </button>

          <button
            type="button"
            onClick={onDiscard}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-destructive hover:bg-destructive/10 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Discard Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
};
