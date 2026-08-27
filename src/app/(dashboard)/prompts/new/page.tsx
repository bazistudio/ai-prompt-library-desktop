import { useState, useEffect, Suspense, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Tag,
  Folder,
  FolderTree,
  Sparkles,
  Layers,
  FileEdit,
  CheckCircle2,
  BookOpen,
  ChevronDown,
} from "lucide-react";
import { createPrompt } from "@/services/prompts/promptService";
import { CategoryItem, fetchCategories } from "@/services/categories/categoryService";
import { SubcategoryItem, fetchSubcategories } from "@/services/categories/subcategoryService";
import { ProjectItem, fetchProjects } from "@/services/projects/projectService";
import { getStoragePath } from "@/services/storage/storageService";
import { promptDraftStore } from "@/services/prompts/promptDraftStore";
import { FirstUseStorageModal } from "@/components/storage/FirstUseStorageModal";
import { CancelDraftModal } from "@/components/modals/CancelDraftModal";
import { RichMarkdownEditor } from "@/components/editor/RichMarkdownEditor";
import { TextDirection } from "@/components/editor/languageDetector";

function CreatePromptContent() {
  const navigate = useNavigate();

  // Multi-step Flow State: Step 1 (Write) -> Step 2 (Details)
  const [step, setStep] = useState<1 | 2>(1);

  // Core Prompt Content (Step 1)
  const [content, setContent] = useState("");
  const [language, setLanguage] = useState("en");
  const [direction, setDirection] = useState<TextDirection>("ltr");

  // Metadata Fields (Step 2)
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Coding");
  const [subcategoryId, setSubcategoryId] = useState<string>("");
  const [projectId, setProjectId] = useState("proj_default");
  const [tagsInput, setTagsInput] = useState("");

  // Loading & Error States
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dynamic Categories, Subcategories & Projects
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [subcategories, setSubcategories] = useState<SubcategoryItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);

  // Modals
  const [isFirstUseModalOpen, setIsFirstUseModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  // Load existing draft if present, and fetch dynamic metadata
  useEffect(() => {
    const draft = promptDraftStore.getDraft();
    if (draft && draft.content) {
      setContent(draft.content);
      setLanguage(draft.language || "en");
      setDirection(draft.direction || "ltr");
      if (draft.title) setTitle(draft.title);
      if (draft.description) setDescription(draft.description);
      if (draft.category) setCategory(draft.category);
      if (draft.subcategoryId) setSubcategoryId(draft.subcategoryId);
      if (draft.projectId) setProjectId(draft.projectId);
      if (draft.tags && Array.isArray(draft.tags)) setTagsInput(draft.tags.join(", "));
    }

    Promise.all([fetchCategories(), fetchSubcategories(), fetchProjects()])
      .then(([cats, subcats, projs]) => {
        setCategories(cats);
        setSubcategories(subcats);
        setProjects(projs);
        if (!draft?.category && cats.length > 0) {
          setCategory(cats[0].name);
        }
        if (!draft?.projectId && projs.length > 0) {
          setProjectId(projs[0].id);
        }
      })
      .catch(console.error);
  }, []);

  // Compute live word count and stats for the prompt
  const stats = useMemo(() => {
    const trimmed = content.trim();
    if (!trimmed) return { words: 0, characters: 0, lines: 0 };
    const words = trimmed.split(/\s+/).filter(Boolean).length;
    const characters = trimmed.length;
    const lines = trimmed.split("\n").length;
    return { words, characters, lines };
  }, [content]);

  // Resolve selected category object and dependent subcategories
  const selectedCategoryObj = useMemo(() => {
    return categories.find((c) => c.name.toLowerCase() === category.toLowerCase());
  }, [categories, category]);

  const availableSubcategories = useMemo(() => {
    if (!selectedCategoryObj) return [];
    return subcategories.filter((s) => s.category_id === selectedCategoryObj.id);
  }, [subcategories, selectedCategoryObj]);

  const handleCategoryChange = (newCatName: string) => {
    setCategory(newCatName);
    setSubcategoryId(""); // Automatically reset subcategory when category changes
  };

  // Step 1 -> Step 2 transition
  const handleContinueToDetails = () => {
    if (!content.trim()) {
      setError("Please write or paste your prompt instructions before continuing.");
      return;
    }
    setError(null);
    setStep(2);
  };

  // Step 2 -> Step 1 back transition
  const handleBackToEditor = () => {
    setError(null);
    setStep(1);
  };

  // Cancel Handler
  const handleCancelClick = () => {
    if (content.trim().length > 0) {
      setIsCancelModalOpen(true);
    } else {
      promptDraftStore.clearDraft();
      navigate("/prompts");
    }
  };

  const handleDiscardDraft = () => {
    promptDraftStore.clearDraft();
    setIsCancelModalOpen(false);
    navigate("/prompts");
  };

  const handleSaveTemporaryDraft = () => {
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    promptDraftStore.setDraft({
      content,
      language,
      direction,
      title,
      description,
      category,
      subcategoryId: subcategoryId || undefined,
      projectId,
      tags,
    });
    setIsCancelModalOpen(false);
    navigate("/prompts");
  };

  // Final Atomic Save in Step 2
  const executeFinalSavePrompt = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);

    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await createPrompt({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        categoryId: selectedCategoryObj?.id,
        subcategoryId: subcategoryId || undefined,
        projectId,
        tags,
        content: content.trim(),
        language,
        textDirection: direction,
      });

      if (res.success && res.promptId) {
        promptDraftStore.clearDraft();
        navigate(`/prompts/${res.promptId}`);
      } else {
        setError(res.error || "Failed to create prompt.");
      }
    } catch (err: any) {
      console.error("Create prompt error:", err);
      setError(err.message || "Failed to save prompt.");
    } finally {
      setSaving(false);
    }
  };

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please enter a prompt title.");
      return;
    }
    if (!category.trim()) {
      setError("Please select a category.");
      return;
    }

    try {
      const storagePath = await getStoragePath();
      if (!storagePath) {
        setIsFirstUseModalOpen(true);
        return;
      }
      await executeFinalSavePrompt();
    } catch (err: any) {
      setError(err.message || "Error checking storage path.");
    }
  };

  const handleFirstUseStorageSuccess = async () => {
    setIsFirstUseModalOpen(false);
    await executeFinalSavePrompt();
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden px-4 sm:px-6 py-2.5 space-y-2 text-left">
      {/* 1. TOP BAR: Category & Version Bar with Step Indicator & Stats */}
      <div className="flex items-center justify-between gap-3 bg-card/70 backdrop-blur-sm border border-border/80 rounded-xl px-4 py-2 shrink-0 shadow-2xs">
        {/* Left Side: Back / Category Pill / Version Badges */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={step === 1 ? handleCancelClick : handleBackToEditor}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer mr-1"
            title={step === 1 ? "Cancel & Return" : "Back to Editor"}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          {/* Dynamic Category Pill Dropdown */}
          <div className="relative flex items-center">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 text-primary border border-primary/30 text-xs font-bold shadow-2xs">
              <Folder className="h-3.5 w-3.5" />
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="bg-transparent text-primary font-bold text-xs outline-none cursor-pointer pr-1"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name} className="bg-popover text-foreground">
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dynamic Subcategory Dropdown (if category has subcategories) */}
          {availableSubcategories.length > 0 && (
            <div className="relative flex items-center">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-foreground border border-border text-xs font-semibold shadow-2xs">
                <FolderTree className="h-3.5 w-3.5 text-primary" />
                <select
                  value={subcategoryId}
                  onChange={(e) => setSubcategoryId(e.target.value)}
                  className="bg-transparent text-foreground font-semibold text-xs outline-none cursor-pointer pr-1"
                >
                  <option value="" className="bg-popover text-muted-foreground">
                    Subcategory (Optional)
                  </option>
                  {availableSubcategories.map((subcat) => (
                    <option key={subcat.id} value={subcat.id} className="bg-popover text-foreground">
                      {subcat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Version Pills Bar (Mockup / Active version) */}
          <div className="flex items-center gap-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-2xs flex items-center gap-1">
              <span>v1</span>
              <span className="text-[10px] opacity-90 font-normal">current</span>
            </span>
          </div>

          {/* Step Progress Pill */}
          <div className="hidden md:flex items-center gap-1.5 ml-2 pl-3 border-l border-border/50 text-xs text-muted-foreground">
            <span className={step === 1 ? "font-bold text-foreground" : ""}>1. Write</span>
            <span>→</span>
            <span className={step === 2 ? "font-bold text-foreground" : ""}>2. Details</span>
          </div>
        </div>

        {/* Right Side: Live Content Stats */}
        <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground shrink-0">
          <div className="flex items-center gap-2 bg-muted/50 border border-border/50 px-2.5 py-1 rounded-lg">
            <span>{stats.words} words</span>
            <span>•</span>
            <span>{stats.characters} chars</span>
          </div>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold shrink-0 animate-in fade-in duration-150">
          {error}
        </div>
      )}

      {/* STEP 1: FULL-HEIGHT DISTRACTION-FREE WRITING AREA */}
      {step === 1 && (
        <div className="flex-1 min-h-0 w-full flex flex-col overflow-hidden animate-in fade-in duration-150">
          {/* Main Full-Height Editor */}
          <div className="flex-1 min-h-0 w-full flex flex-col rounded-xl border border-border bg-card overflow-hidden shadow-xs">
            <RichMarkdownEditor
              value={content}
              onChange={setContent}
              language={language}
              onLanguageChange={(newLang, newDir) => {
                setLanguage(newLang);
                setDirection(newDir);
              }}
              direction={direction}
              onDirectionChange={setDirection}
              placeholder="Write or paste your prompt here..."
              className="flex-1 min-h-0 h-full border-0 rounded-none shadow-none"
            />
          </div>

          {/* 2. CENTERED BOTTOM ACTION BAR (Step 1) */}
          <div className="flex items-center justify-center gap-4 py-2 shrink-0">
            <button
              type="button"
              onClick={handleCancelClick}
              className="px-6 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs font-bold text-foreground transition-all cursor-pointer shadow-2xs hover:shadow-xs min-w-[120px]"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleContinueToDetails}
              className="inline-flex items-center justify-center gap-2 px-8 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs transition-all shadow-md shadow-primary/25 cursor-pointer min-w-[150px]"
            >
              <span>Continue →</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: PROMPT DETAILS & METADATA (Single Screen Fits Cleanly) */}
      {step === 2 && (
        <form onSubmit={handleDetailsSubmit} className="flex-1 min-h-0 w-full flex flex-col overflow-hidden animate-in fade-in duration-150">
          <div className="flex-1 min-h-0 w-full overflow-y-auto rounded-xl border border-border bg-card p-6 space-y-4 shadow-xs scrollbar-thin">
            {/* Quick Content Summary Card */}
            <div className="p-3.5 rounded-xl bg-secondary/40 border border-border flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-semibold text-foreground block">Prompt Content Confirmed</span>
                  <span className="text-[11px] text-muted-foreground">
                    {stats.words} words • {stats.characters} characters • {language.toUpperCase()} ({direction.toUpperCase()})
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleBackToEditor}
                className="text-xs font-semibold text-primary hover:underline cursor-pointer"
              >
                Edit Content
              </button>
            </div>

            {/* Prompt Title (Required) */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                Prompt Title <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. YouTube Video Script Generator, Python Code Reviewer..."
                className="block w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
            </div>

            {/* Category, Subcategory & Workspace Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Parent Category (Required) */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                  <Folder className="h-3.5 w-3.5 text-primary" />
                  Category <span className="text-destructive">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="block w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-ring/50 cursor-pointer"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dependent Subcategory (Optional) */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                  <FolderTree className="h-3.5 w-3.5 text-primary" />
                  Subcategory <span className="text-muted-foreground font-normal">(Optional)</span>
                </label>
                <select
                  value={subcategoryId}
                  onChange={(e) => setSubcategoryId(e.target.value)}
                  disabled={availableSubcategories.length === 0}
                  className="block w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-ring/50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {availableSubcategories.length === 0
                      ? "No subcategories available"
                      : "No Subcategory (None)"}
                  </option>
                  {availableSubcategories.map((subcat) => (
                    <option key={subcat.id} value={subcat.id}>
                      {subcat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Workspace / Project */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  Workspace / Project
                </label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="block w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-ring/50 cursor-pointer"
                >
                  {projects.map((proj) => (
                    <option key={proj.id} value={proj.id}>
                      {proj.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tags (Optional) */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-primary" />
                Tags (Comma separated)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="youtube, marketing, urdu, ai"
                className="block w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
            </div>

            {/* Description (Optional) */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                Short Description (Optional)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary or context of when to use this prompt..."
                className="block w-full px-3.5 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring/50 resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* 2. CENTERED BOTTOM ACTION BAR (Step 2) */}
          <div className="flex items-center justify-center gap-4 py-2 shrink-0">
            <button
              type="button"
              onClick={handleBackToEditor}
              className="inline-flex items-center justify-center gap-2 px-6 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs font-bold text-foreground transition-all cursor-pointer min-w-[120px]"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 px-8 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs transition-all shadow-md shadow-primary/25 cursor-pointer disabled:opacity-50 min-w-[160px]"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creating Prompt...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Save Prompt (v1)</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* First Use Storage Location Modal */}
      <FirstUseStorageModal
        isOpen={isFirstUseModalOpen}
        onClose={() => setIsFirstUseModalOpen(false)}
        onSelectSuccess={handleFirstUseStorageSuccess}
      />

      {/* Cancel & Draft Confirmation Modal */}
      <CancelDraftModal
        isOpen={isCancelModalOpen}
        onKeepEditing={() => setIsCancelModalOpen(false)}
        onSaveDraft={handleSaveTemporaryDraft}
        onDiscard={handleDiscardDraft}
      />
    </div>
  );
}

export default function CreatePromptPage() {
  return (
    <Suspense fallback={<div className="h-full flex items-center justify-center text-muted-foreground text-xs">Loading editor...</div>}>
      <CreatePromptContent />
    </Suspense>
  );
}
