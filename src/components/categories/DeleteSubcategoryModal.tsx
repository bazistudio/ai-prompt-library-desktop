"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Trash2, X, Loader2 } from "lucide-react";
import {
  SubcategoryItem,
  deleteSubcategory,
  countPromptsInSubcategory,
} from "@/services/categories/subcategoryService";

interface DeleteSubcategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  subcategory: SubcategoryItem | null;
}

export function DeleteSubcategoryModal({
  isOpen,
  onClose,
  onSuccess,
  subcategory,
}: DeleteSubcategoryModalProps) {
  const [promptCount, setPromptCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !subcategory) {
      setPromptCount(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoadingCount(true);
    setError(null);

    countPromptsInSubcategory(subcategory.id)
      .then((count) => {
        if (isMounted) setPromptCount(count);
      })
      .catch((err) => {
        console.error("Error fetching prompt count for subcategory:", err);
        if (isMounted) setPromptCount(0);
      })
      .finally(() => {
        if (isMounted) setLoadingCount(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, subcategory]);

  if (!isOpen || !subcategory) return null;

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);

    try {
      const res = await deleteSubcategory(subcategory.id);
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || "Failed to delete subcategory.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-5 text-left animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Delete Subcategory?</h3>
              <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">
            {error}
          </div>
        )}

        <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-2 text-xs">
          <p className="font-semibold text-foreground">
            {loadingCount ? (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Checking affected prompts...
              </span>
            ) : (
              <span>
                &ldquo;<strong>{subcategory.name}</strong>&rdquo; is assigned to{" "}
                <span className="text-primary font-bold">{promptCount ?? 0}</span> prompt
                {promptCount === 1 ? "" : "s"}.
              </span>
            )}
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Deleting this subcategory will safely remove the subcategory assignment from those prompts.
            Your prompt documents and content will <strong>remain intact</strong>.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border/40">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted text-foreground font-semibold text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold text-xs transition-all shadow-md shadow-destructive/20 cursor-pointer disabled:opacity-50"
          >
            {deleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Subcategory</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
