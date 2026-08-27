"use client";

import { useState, useEffect } from "react";
import { FolderTree, Edit2, X, Loader2, Folder } from "lucide-react";
import {
  SubcategoryItem,
  createSubcategory,
  updateSubcategory,
} from "@/services/categories/subcategoryService";
import { CategoryItem } from "@/services/categories/categoryService";

interface SubcategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (subcategory: SubcategoryItem) => void;
  parentCategory: CategoryItem;
  subcategoryToEdit?: SubcategoryItem | null;
}

export function SubcategoryModal({
  isOpen,
  onClose,
  onSuccess,
  parentCategory,
  subcategoryToEdit,
}: SubcategoryModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(subcategoryToEdit);

  useEffect(() => {
    if (subcategoryToEdit) {
      setName(subcategoryToEdit.name);
      setDescription(subcategoryToEdit.description || "");
    } else {
      setName("");
      setDescription("");
    }
    setError(null);
  }, [subcategoryToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError("Subcategory name cannot be empty.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isEdit && subcategoryToEdit) {
        const res = await updateSubcategory(subcategoryToEdit.id, cleanName, description);
        if (res.success && res.subcategory) {
          onSuccess(res.subcategory);
          onClose();
        } else {
          setError(res.error || "Failed to update subcategory.");
        }
      } else {
        const res = await createSubcategory(parentCategory.id, cleanName, description);
        if (res.success && res.subcategory) {
          onSuccess(res.subcategory);
          onClose();
        } else {
          setError(res.error || "Failed to create subcategory.");
        }
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-5 text-left animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              {isEdit ? <Edit2 className="h-5 w-5" /> : <FolderTree className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                {isEdit ? "Edit Subcategory" : "Create Subcategory"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {isEdit
                  ? "Update subcategory details."
                  : `Add a subcategory under ${parentCategory.name}.`}
              </p>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Parent Category Read-only Indicator */}
          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
              <Folder className="h-3.5 w-3.5 text-primary" />
              Parent Category
            </label>
            <div className="px-3.5 py-2.5 rounded-xl border border-border/80 bg-muted/50 text-foreground text-xs font-semibold flex items-center justify-between">
              <span>{parentCategory.name}</span>
              <span className="text-[10px] text-muted-foreground uppercase font-mono">Category</span>
            </div>
          </div>

          {/* Subcategory Name */}
          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">
              Subcategory Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Social Media, React, SEO, Email Marketing..."
              className="block w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ring/50"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">
              Description <span className="text-muted-foreground font-normal">(Optional)</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this prompt subcategory..."
              className="block w-full px-3.5 py-2 rounded-xl border border-border bg-background text-foreground text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring/50 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/40">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted text-foreground font-semibold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs transition-all shadow-md shadow-primary/25 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEdit ? "Save Changes" : "Create Subcategory"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
