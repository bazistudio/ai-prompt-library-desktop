import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Copy,
  Check,
  Star,
  PlusCircle,
  Folder,
  Tag,
  Clock,
  Trash2,
  Loader2,
  Sparkles,
  RotateCcw,
  Edit3,
  Eye,
  FileCode,
  Activity,
} from "lucide-react";
import {
  fetchPromptById,
  addPromptVersion,
  updatePromptMeta,
  toggleFavorite,
  deletePrompt,
  PromptItem,
  PromptVersion,
} from "@/services/prompts/promptService";
import { MarkdownRenderer } from "@/components/editor/MarkdownRenderer";
import { RichMarkdownEditor } from "@/components/editor/RichMarkdownEditor";
import { TextDirection } from "@/components/editor/languageDetector";
import { AIEnhanceModal } from "@/components/modals/AIEnhanceModal";
import { SafeDeletePromptModal } from "@/components/prompts/SafeDeletePromptModal";

export default function PromptDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [prompt, setPrompt] = useState<PromptItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVersionNum, setSelectedVersionNum] = useState<number | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [language, setLanguage] = useState("en");
  const [direction, setDirection] = useState<TextDirection>("auto");
  const [changeSummary, setChangeSummary] = useState("");
  const [savingVersion, setSavingVersion] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [viewFormat, setViewFormat] = useState<"formatted" | "raw">("formatted");
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [enhanceModalOpen, setEnhanceModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const loadPromptData = useCallback(async () => {
    try {
      const data = await fetchPromptById(id);
      setPrompt(data);
      if (data) {
        setLanguage(data.language || "en");
        setDirection(data.text_direction || "auto");
        if (data.versions && data.versions.length > 0) {
          const latest = data.current_version || data.versions[data.versions.length - 1].version_number;
          setSelectedVersionNum(latest);
          const activeVerObj = data.versions.find((v) => v.version_number === latest);
          setEditedContent(activeVerObj ? activeVerObj.content : "");
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load prompt.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadPromptData();
  }, [loadPromptData]);

  // Listen to menu delete prompt action
  useEffect(() => {
    const handleMenuDelete = () => {
      setIsDeleteModalOpen(true);
    };
    window.addEventListener("app:trigger-safe-delete-prompt", handleMenuDelete);
    return () => window.removeEventListener("app:trigger-safe-delete-prompt", handleMenuDelete);
  }, []);

  const activeVersion: PromptVersion | undefined = prompt?.versions?.find(
    (v) => v.version_number === selectedVersionNum
  );

  const isCurrentVersion = selectedVersionNum === prompt?.current_version;

  const handleSelectVersion = (verNum: number) => {
    setSelectedVersionNum(verNum);
    const ver = prompt?.versions?.find((v) => v.version_number === verNum);
    if (ver) {
      setEditedContent(ver.content);
    }
    setIsEditing(false);
  };

  const handleCopy = async () => {
    const textToCopy = isEditing ? editedContent : activeVersion?.content || editedContent;
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);

      if (prompt) {
        fetch(`/api/desktop-prompts/${prompt.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "logUsage" }),
        }).catch(() => {});
      }
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  const handleToggleFavorite = async () => {
    if (!prompt) return;
    try {
      const res = await toggleFavorite(prompt.id);
      setPrompt((prev) => (prev ? { ...prev, is_favorite: res.is_favorite } : null));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = () => {
    if (!prompt) return;
    setIsDeleteModalOpen(true);
  };

  const handleVersionsDeleted = (updatedPrompt: PromptItem) => {
    setPrompt(updatedPrompt);
    setSelectedVersionNum(updatedPrompt.current_version);
    setEditedContent(updatedPrompt.current_content || "");
    setIsEditing(false);
  };

  const handleSaveAsNewVersion = async () => {
    if (!prompt || !editedContent.trim() || savingVersion) return;

    const activeContent = activeVersion?.content || "";
    if (editedContent.trim() === activeContent.trim()) {
      setError("No changes detected. Please edit the prompt content before saving a new version.");
      return;
    }

    setSavingVersion(true);
    setError(null);

    try {
      if (language !== prompt.language || direction !== prompt.text_direction) {
        await updatePromptMeta({
          promptId: prompt.id,
          language,
          textDirection: direction,
        });
      }

      const res = await addPromptVersion({
        promptId: prompt.id,
        content: editedContent.trim(),
        changeSummary: changeSummary.trim() || undefined,
      });

      if (res.success) {
        setChangeSummary("");
        setIsEditing(false);
        await loadPromptData();
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to save new version.");
    } finally {
      setSavingVersion(false);
    }
  };

  const handleRestoreAsNewVersion = async () => {
    if (!prompt || !activeVersion) return;
    if (
      confirm(
        `Restore Version v${activeVersion.version_number} content as a new Version v${
          (prompt.current_version || 1) + 1
        }?`
      )
    ) {
      setSavingVersion(true);
      try {
        const res = await addPromptVersion({
          promptId: prompt.id,
          content: activeVersion.content,
          changeSummary: `Restored from version v${activeVersion.version_number}`,
        });

        if (res.success) {
          setIsEditing(false);
          await loadPromptData();
        }
      } catch (err) {
        console.error(err);
      } finally {
        setSavingVersion(false);
      }
    }
  };

  const currentContentToDisplay = activeVersion?.content || editedContent;

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-xs font-semibold">Opening prompt document...</span>
      </div>
    );
  }

  if (error && !prompt) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-4">
        <h2 className="text-xl font-bold text-foreground">Prompt Not Found</h2>
        <p className="text-xs text-muted-foreground">{error || "Prompt does not exist in local database."}</p>
        <Link
          to="/prompts"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Return to Library</span>
        </Link>
      </div>
    );
  }

  if (!prompt) return null;

  return (
    <div className="h-full w-full flex flex-col overflow-hidden px-4 sm:px-6 py-2.5 space-y-2 text-left">
      {/* 1. TOP UNIFIED BAR: Title, Category & Version Pills, Actions */}
      <div className="flex items-center justify-between gap-3 bg-card/70 backdrop-blur-sm border border-border/80 rounded-xl px-4 py-2 shrink-0 shadow-2xs">
        {/* Left Side: Back / Title / Category / Version History Pills */}
        <div className="flex items-center gap-2.5 flex-wrap min-w-0">
          <Link
            to="/prompts"
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
            title="Back to Library"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <span className="text-sm font-bold text-foreground truncate max-w-[200px] sm:max-w-[300px]">
            {prompt.title}
          </span>

          {/* Category Pill */}
          <span className="px-2.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 text-xs font-bold shadow-2xs flex items-center gap-1 shrink-0">
            <Folder className="h-3 w-3" />
            <span>{prompt.category}</span>
            {prompt.subcategory_name && (
              <>
                <span className="text-primary/60 font-normal">→</span>
                <span>{prompt.subcategory_name}</span>
              </>
            )}
          </span>

          {/* Version Pills Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
            {prompt.versions?.map((ver) => {
              const isSelected = ver.version_number === selectedVersionNum;
              const isLatest = ver.version_number === prompt.current_version;

              return (
                <button
                  key={ver.id}
                  type="button"
                  onClick={() => handleSelectVersion(ver.version_number)}
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "bg-secondary text-muted-foreground hover:text-foreground border border-border"
                  }`}
                >
                  <span>v{ver.version_number}</span>
                  {isLatest && <span className="text-[9px] opacity-85 font-normal">current</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Quick Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* AI Enhance */}
          <button
            type="button"
            onClick={() => setEnhanceModalOpen(true)}
            className="px-3 py-1 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Enhance with AI"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Enhance AI</span>
          </button>

          {/* Copy Active Prompt */}
          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-1 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>

          {/* Favorite */}
          <button
            type="button"
            onClick={handleToggleFavorite}
            className="p-1.5 rounded-lg border border-border hover:bg-muted text-foreground transition-colors cursor-pointer"
            title={prompt.is_favorite ? "Starred" : "Star Favorite"}
          >
            <Star
              className={`h-3.5 w-3.5 ${
                prompt.is_favorite ? "text-amber-500 fill-amber-500" : "text-muted-foreground"
              }`}
            />
          </button>

          {/* Delete */}
          <button
            type="button"
            onClick={handleDelete}
            className="p-1.5 rounded-lg border border-destructive/30 bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors cursor-pointer"
            title="Delete Prompt"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold shrink-0">
          {error}
        </div>
      )}

      {/* 2. FULL-HEIGHT WORKSPACE (View or Edit Mode) */}
      <div className="flex-1 min-h-0 w-full flex flex-col overflow-hidden">
        {isEditing ? (
          <div className="flex-1 min-h-0 w-full flex flex-col rounded-xl border border-border bg-card overflow-hidden shadow-xs">
            <RichMarkdownEditor
              value={editedContent}
              onChange={setEditedContent}
              language={language}
              onLanguageChange={(newLang, newDir) => {
                setLanguage(newLang);
                setDirection(newDir);
              }}
              direction={direction}
              onDirectionChange={setDirection}
              placeholder="Edit prompt instructions with rich markdown formatting..."
              className="flex-1 min-h-0 h-full border-0 rounded-none shadow-none"
            />
          </div>
        ) : (
          <div className="flex-1 min-h-0 w-full flex flex-col rounded-xl border border-border bg-card overflow-hidden shadow-xs">
            {/* View Format Header Bar */}
            <div className="flex items-center justify-between px-4 py-1.5 bg-muted/40 border-b border-border text-xs text-muted-foreground shrink-0">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Prompt Instructions (v{selectedVersionNum})
              </span>

              <div className="flex items-center bg-background border border-border rounded-lg p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setViewFormat("formatted")}
                  className={`px-2.5 py-0.5 rounded-md font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                    viewFormat === "formatted" ? "bg-card text-foreground font-semibold shadow-2xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Eye className="h-3 w-3" />
                  <span>Rich View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewFormat("raw")}
                  className={`px-2.5 py-0.5 rounded-md font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                    viewFormat === "raw" ? "bg-card text-foreground font-semibold shadow-2xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileCode className="h-3 w-3" />
                  <span>Raw Text</span>
                </button>
              </div>
            </div>

            {/* View Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-6 scrollbar-thin">
              {viewFormat === "formatted" ? (
                <MarkdownRenderer
                  content={currentContentToDisplay}
                  textDirection={direction}
                  interactiveChecklists={false}
                />
              ) : (
                <pre
                  className="font-mono text-xs leading-relaxed text-foreground whitespace-pre-wrap"
                  dir={direction === "auto" ? "auto" : direction}
                >
                  {currentContentToDisplay}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. CENTERED BOTTOM ACTION BAR */}
      <div className="flex items-center justify-center gap-3 py-1 shrink-0">
        {isEditing ? (
          <div className="flex items-center justify-center gap-3 w-full max-w-2xl">
            <input
              type="text"
              value={changeSummary}
              onChange={(e) => setChangeSummary(e.target.value)}
              placeholder="Version change summary (optional)..."
              className="flex-1 px-3.5 py-1.5 rounded-xl border border-border bg-card text-foreground text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring/50"
            />

            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                if (activeVersion) setEditedContent(activeVersion.content);
              }}
              className="px-5 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-bold text-foreground transition-all cursor-pointer shrink-0"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSaveAsNewVersion}
              disabled={savingVersion || !editedContent.trim()}
              className="inline-flex items-center justify-center gap-2 px-6 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-md shadow-primary/25 cursor-pointer disabled:opacity-50 shrink-0"
            >
              {savingVersion ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving v{(prompt.current_version || 1) + 1}...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>Save as Version v{(prompt.current_version || 1) + 1}</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3">
            {!isCurrentVersion && (
              <button
                type="button"
                onClick={handleRestoreAsNewVersion}
                disabled={savingVersion}
                className="px-5 py-1.5 rounded-xl bg-primary/15 text-primary border border-primary/30 text-xs font-bold flex items-center gap-1.5 hover:bg-primary/25 transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Restore v{selectedVersionNum} as New Version</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center justify-center gap-2 px-8 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs transition-all shadow-md shadow-primary/25 cursor-pointer min-w-[160px]"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Edit & New Version</span>
            </button>
          </div>
        )}
      </div>

      {/* AI Enhancement Modal */}
      <AIEnhanceModal
        isOpen={enhanceModalOpen}
        onClose={() => setEnhanceModalOpen(false)}
        originalContent={isEditing ? editedContent : activeVersion?.content || editedContent}
        onApply={(enhanced) => {
          setEditedContent(enhanced);
          setIsEditing(true);
        }}
        onSaveAsVersion={async (enhanced) => {
          setEditedContent(enhanced);
          setChangeSummary("Enhanced with Gemini AI");
          setIsEditing(true);
        }}
      />

      {/* Multi-Step Safe Delete Modal */}
      <SafeDeletePromptModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        prompt={prompt}
        onPromptDeleted={() => navigate("/prompts")}
        onVersionsDeleted={handleVersionsDeleted}
      />
    </div>
  );
}
