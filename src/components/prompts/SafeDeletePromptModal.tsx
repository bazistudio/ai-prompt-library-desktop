"use client";

import { useState, useEffect } from "react";
import {
  AlertTriangle,
  Trash2,
  X,
  Loader2,
  Clock,
  History,
  CheckSquare,
  Square,
  ArrowLeft,
  Layers,
  Folder,
} from "lucide-react";
import { PromptItem, deletePrompt, deletePromptVersions } from "@/services/prompts/promptService";

interface SafeDeletePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: PromptItem | null;
  onPromptDeleted: () => void;
  onVersionsDeleted: (updatedPrompt: PromptItem) => void;
}

type ModalStep = "select" | "confirm_versions" | "confirm_complete";

export function SafeDeletePromptModal({
  isOpen,
  onClose,
  prompt,
  onPromptDeleted,
  onVersionsDeleted,
}: SafeDeletePromptModalProps) {
  const [step, setStep] = useState<ModalStep>("select");
  const [selectedVersionIds, setSelectedVersionIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep("select");
      setSelectedVersionIds([]);
      setError(null);
      setLoading(false);
    }
  }, [isOpen, prompt]);

  if (!isOpen || !prompt) return null;

  const versions = (prompt.versions && prompt.versions.length > 0)
    ? [...prompt.versions].sort((a, b) => a.version_number - b.version_number)
    : [
        {
          id: `v_current_${prompt.id}`,
          prompt_id: prompt.id,
          version_number: prompt.current_version || 1,
          content: prompt.current_content || "",
          created_at: prompt.created_at || Date.now(),
        },
      ];

  const totalVersionCount = versions.length;
  const isSingleVersion = totalVersionCount <= 1;
  const selectedCount = selectedVersionIds.length;
  const isAllVersionsSelected = selectedCount >= totalVersionCount;

  const toggleSelectVersion = (versionId: string) => {
    if (isSingleVersion) return;
    setError(null);
    setSelectedVersionIds((prev) =>
      prev.includes(versionId) ? prev.filter((id) => id !== versionId) : [...prev, versionId]
    );
  };

  const selectAllExceptLatest = () => {
    if (isSingleVersion) return;
    const latestVer = versions[versions.length - 1];
    const nonLatestIds = versions.filter((v) => v.id !== latestVer.id).map((v) => v.id);
    setSelectedVersionIds(nonLatestIds);
  };

  const handleExecuteDeleteVersions = async () => {
    if (selectedVersionIds.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      const res = await deletePromptVersions(prompt.id, selectedVersionIds);
      if (res.success && res.updatedPrompt) {
        onVersionsDeleted(res.updatedPrompt);
        onClose();
      } else {
        setError(res.error || "Unable to delete the selected versions. No changes were made.");
      }
    } catch (err: any) {
      setError(err.message || "Unable to delete the selected versions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteDeleteCompletePrompt = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await deletePrompt(prompt.id);
      if (res.success) {
        onPromptDeleted();
        onClose();
      } else {
        setError(res.error || "Unable to delete this prompt. No changes were made.");
      }
    } catch (err: any) {
      setError(err.message || "Unable to delete this prompt. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (ts: number) => {
    try {
      return new Date(ts).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Unknown date";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-5 text-left animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                {step === "select"
                  ? "Delete Prompt"
                  : step === "confirm_versions"
                  ? "Confirm Version Deletion"
                  : "Delete Complete Prompt?"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {step === "select"
                  ? "Choose specific versions to remove or delete the entire prompt."
                  : step === "confirm_versions"
                  ? "Review selected versions before permanent removal."
                  : "Permanent prompt removal confirmation."}
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

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">
            {error}
          </div>
        )}

        {/* ================= STEP 1: SELECTION UI ================= */}
        {step === "select" && (
          <div className="space-y-4">
            {/* Prompt Identity Info Box */}
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <h4 className="text-sm font-bold text-foreground truncate">{prompt.title}</h4>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Folder className="h-3 w-3 text-primary" />
                    <span>{prompt.category}</span>
                    {prompt.subcategory_name && (
                      <span className="text-primary font-medium">/ {prompt.subcategory_name}</span>
                    )}
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold shrink-0 flex items-center gap-1">
                <History className="h-3 w-3" />
                <span>
                  {totalVersionCount} {totalVersionCount === 1 ? "Version" : "Versions"}
                </span>
              </span>
            </div>

            {/* Version Selection Header */}
            <div className="flex items-center justify-between pt-1">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-primary" />
                Select versions to delete:
              </label>
              {!isSingleVersion && totalVersionCount > 2 && (
                <button
                  type="button"
                  onClick={selectAllExceptLatest}
                  className="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
                >
                  Select older versions
                </button>
              )}
            </div>

            {/* Version List */}
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 border border-border/80 rounded-xl p-2 bg-background/50">
              {versions.map((ver) => {
                const isSelected = selectedVersionIds.includes(ver.id);
                const isCurrent = ver.version_number === prompt.current_version;

                return (
                  <div
                    key={ver.id}
                    onClick={() => toggleSelectVersion(ver.id)}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-xs transition-all ${
                      isSingleVersion
                        ? "opacity-60 cursor-not-allowed border-border/60 bg-muted/20"
                        : isSelected
                        ? "bg-destructive/10 border-destructive/30 text-destructive font-semibold cursor-pointer"
                        : "border-border/60 hover:bg-muted/50 hover:border-border cursor-pointer text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {isSingleVersion ? (
                        <Square className="h-4 w-4 text-muted-foreground/40" />
                      ) : isSelected ? (
                        <CheckSquare className="h-4 w-4 text-destructive shrink-0" />
                      ) : (
                        <Square className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">Version {ver.version_number}</span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-primary/15 text-primary border border-primary/25">
                              Current Active
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Created: {formatDate(ver.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Explanatory Alerts */}
            {isSingleVersion ? (
              <div className="p-3 rounded-xl bg-muted/60 border border-border/80 text-xs text-muted-foreground">
                This prompt contains only 1 saved version. A prompt cannot have 0 versions. To remove this prompt, use <strong>Delete Complete Prompt</strong> below.
              </div>
            ) : isAllVersionsSelected ? (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 font-semibold">
                You have selected all versions. To delete the prompt and all versions, please use <strong>Delete Complete Prompt</strong>.
              </div>
            ) : null}

            {/* Action Buttons: Option A vs Option B */}
            <div className="pt-3 border-t border-border/60 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Option A: Delete Selected Versions */}
                <button
                  type="button"
                  disabled={selectedCount === 0 || isAllVersionsSelected}
                  onClick={() => setStep("confirm_versions")}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-destructive/30 bg-destructive/10 hover:bg-destructive/20 text-destructive font-bold text-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <History className="h-3.5 w-3.5" />
                  <span>
                    Delete Selected Versions {selectedCount > 0 ? `(${selectedCount})` : ""}
                  </span>
                </button>

                {/* Option B: Delete Complete Prompt */}
                <button
                  type="button"
                  onClick={() => setStep("confirm_complete")}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold text-xs transition-all shadow-md shadow-destructive/20 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Complete Prompt</span>
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 rounded-xl border border-border bg-card hover:bg-muted text-foreground font-semibold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 2A: CONFIRM SELECTED VERSIONS ================= */}
        {step === "confirm_versions" && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 space-y-2 text-xs">
              <p className="font-bold text-foreground text-sm">
                Are you sure you want to delete {selectedCount} version
                {selectedCount === 1 ? "" : "s"}?
              </p>
              <p className="text-muted-foreground leading-relaxed">
                The prompt <strong>&ldquo;{prompt.title}&rdquo;</strong> and its remaining versions will remain safely stored. This version deletion cannot be undone.
              </p>
            </div>

            <div className="space-y-1 text-xs">
              <span className="font-bold text-foreground block mb-1">
                Versions marked for deletion:
              </span>
              <div className="max-h-36 overflow-y-auto space-y-1 bg-muted/40 p-2.5 rounded-xl border border-border">
                {versions
                  .filter((v) => selectedVersionIds.includes(v.id))
                  .map((v) => (
                    <div key={v.id} className="flex items-center justify-between text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        • Version {v.version_number}
                        {v.version_number === prompt.current_version && (
                          <span className="text-primary font-bold ml-1.5">(Current)</span>
                        )}
                      </span>
                      <span>Created {formatDate(v.created_at)}</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/40">
              <button
                type="button"
                disabled={loading}
                onClick={() => setStep("select")}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted text-foreground font-semibold text-xs transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleExecuteDeleteVersions}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold text-xs transition-all shadow-md shadow-destructive/20 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Deleting versions...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Confirm Delete Versions</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 2B: CONFIRM COMPLETE PROMPT DELETION ================= */}
        {step === "confirm_complete" && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 space-y-2.5 text-xs">
              <div className="flex items-center gap-2 text-destructive font-bold text-sm">
                <AlertTriangle className="h-4 w-4" />
                <span>Permanent Prompt Deletion</span>
              </div>
              <p className="text-foreground leading-relaxed font-semibold">
                You are about to permanently delete:
              </p>
              <p className="text-sm font-bold text-foreground bg-background/80 p-2.5 rounded-lg border border-destructive/20">
                {prompt.title}
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground pt-1">
                <li>The prompt record and metadata</li>
                <li>All {totalVersionCount} saved versions and edit history</li>
                <li>Associated project tags and physical files</li>
              </ul>
              <p className="text-destructive font-bold text-[11px] pt-1">
                This action is permanent and cannot be recovered.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/40">
              <button
                type="button"
                disabled={loading}
                onClick={() => setStep("select")}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted text-foreground font-semibold text-xs transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleExecuteDeleteCompletePrompt}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold text-xs transition-all shadow-lg shadow-destructive/25 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Deleting prompt...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Complete Prompt</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
