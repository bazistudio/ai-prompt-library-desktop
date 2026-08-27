"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Folder,
  Tag,
  Star,
  Clock,
  ArrowRight,
  X,
  FileText,
  Loader2,
  FolderTree,
} from "lucide-react";
import { PromptItem, fetchPrompts } from "@/services/prompts/promptService";

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenQuickCapture?: () => void;
  onOpenShortcuts?: () => void;
}

export function CommandPaletteModal({
  isOpen,
  onClose,
}: CommandPaletteModalProps) {
  const [query, setQuery] = useState("");
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Fetch prompts when opened
  useEffect(() => {
    if (!isOpen) return;

    setQuery("");
    setSelectedIndex(0);
    setLoading(true);

    fetchPrompts()
      .then((data) => {
        if (Array.isArray(data)) {
          setPrompts(data);
        }
      })
      .catch((err) => console.error("Failed to load prompts for search:", err))
      .finally(() => setLoading(false));

    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  }, [isOpen]);

  // Comprehensive multi-field filtering (Title, Category, Subcategory, Tags, Description, Content)
  const filteredPrompts = useMemo(() => {
    if (!query.trim()) {
      return [...prompts].sort((a, b) => b.updated_at - a.updated_at);
    }

    const q = query.toLowerCase().trim();

    return prompts.filter((p) => {
      // 1. Title match
      const titleMatch = p.title?.toLowerCase().includes(q);

      // 2. Category match
      const categoryMatch = p.category?.toLowerCase().includes(q);

      // 3. Subcategory match
      const subcategoryMatch = p.subcategory_name
        ? p.subcategory_name.toLowerCase().includes(q)
        : false;

      // 4. Tags match
      const tagsMatch = Array.isArray(p.tags)
        ? p.tags.some((t) => t.toLowerCase().includes(q))
        : false;

      // 5. Description match
      const descMatch = p.description ? p.description.toLowerCase().includes(q) : false;

      // 6. Content match
      const contentMatch = p.current_content
        ? p.current_content.toLowerCase().includes(q)
        : false;

      return (
        titleMatch ||
        categoryMatch ||
        subcategoryMatch ||
        tagsMatch ||
        descMatch ||
        contentMatch
      );
    });
  }, [query, prompts]);

  // Adjust selection bounds when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredPrompts.length]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredPrompts.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : Math.max(0, filteredPrompts.length - 1)));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredPrompts[selectedIndex]) {
        navigate(`/prompts/${filteredPrompts[selectedIndex].id}`);
        onClose();
      } else if (query.trim()) {
        navigate(`/prompts?search=${encodeURIComponent(query.trim())}`);
        onClose();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const handleSelectPrompt = (promptId: string) => {
    navigate(`/prompts/${promptId}`);
    onClose();
  };

  const formatDate = (ts: number) => {
    try {
      return new Date(ts).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-16 sm:pt-20 px-3 sm:px-4">
      <div
        className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[82vh] animate-in fade-in zoom-in-95 duration-150"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-border gap-3 bg-muted/20">
          <Search className="h-5 w-5 text-primary shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search prompts by title, category, subcategory, tags, or content..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder-muted-foreground/60 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-muted-foreground hover:text-foreground p-1 rounded-md cursor-pointer transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-medium text-muted-foreground bg-muted border border-border rounded">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div ref={listRef} className="overflow-y-auto flex-1 p-2 space-y-1">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2.5 text-xs text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span>Searching prompt index...</span>
            </div>
          ) : filteredPrompts.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <div className="h-10 w-10 mx-auto rounded-xl bg-muted/50 border border-border flex items-center justify-center text-muted-foreground">
                <FileText className="h-5 w-5" />
              </div>
              <p className="text-xs font-semibold text-foreground">
                No prompts found matching &ldquo;{query}&rdquo;
              </p>
              <p className="text-[11px] text-muted-foreground">
                Try searching with a different title, category, subcategory, or tag keyword.
              </p>
            </div>
          ) : (
            filteredPrompts.map((prompt, index) => {
              const isSelected = index === selectedIndex;

              return (
                <div
                  key={prompt.id}
                  data-index={index}
                  onClick={() => handleSelectPrompt(prompt.id)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex flex-col gap-1.5 p-3 rounded-xl cursor-pointer transition-colors border text-left ${
                    isSelected
                      ? "bg-primary/10 border-primary/30 text-foreground shadow-2xs"
                      : "border-transparent hover:bg-muted/50 text-foreground"
                  }`}
                >
                  {/* Top Metadata Row */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      {/* Category & Subcategory Badge */}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-foreground border border-border flex items-center gap-1">
                        <Folder className="h-3 w-3 text-primary" />
                        <span>{prompt.category}</span>
                        {prompt.subcategory_name && (
                          <>
                            <span className="text-muted-foreground/60 font-normal">→</span>
                            <span className="text-primary">{prompt.subcategory_name}</span>
                          </>
                        )}
                      </span>

                      {/* Version Pill */}
                      <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">
                        v{prompt.current_version}
                      </span>

                      {/* Favorite Star */}
                      {prompt.is_favorite && (
                        <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                      <Clock className="h-3 w-3" />
                      <span>{formatDate(prompt.updated_at)}</span>
                    </div>
                  </div>

                  {/* Title & Preview Snippet */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">
                        {prompt.title}
                      </h4>
                      <p className="text-[11px] text-muted-foreground line-clamp-1 leading-relaxed">
                        {prompt.description || prompt.current_content || "No description provided."}
                      </p>
                    </div>

                    <ArrowRight
                      className={`h-4 w-4 shrink-0 transition-opacity ${
                        isSelected ? "text-primary opacity-100" : "opacity-0"
                      }`}
                    />
                  </div>

                  {/* Tags Row */}
                  {prompt.tags && prompt.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {prompt.tags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-muted text-muted-foreground flex items-center gap-0.5"
                        >
                          <Tag className="h-2.5 w-2.5" />
                          {tag}
                        </span>
                      ))}
                      {prompt.tags.length > 4 && (
                        <span className="text-[9px] text-muted-foreground/70">
                          +{prompt.tags.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 border-t border-border bg-muted/30 flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="font-mono bg-muted px-1.5 py-0.5 rounded border border-border">↑</kbd>{" "}
              <kbd className="font-mono bg-muted px-1.5 py-0.5 rounded border border-border">↓</kbd> to
              navigate
            </span>
            <span>
              <kbd className="font-mono bg-muted px-1.5 py-0.5 rounded border border-border">↵</kbd> to
              open prompt
            </span>
          </div>
          <div>{filteredPrompts.length} prompts</div>
        </div>
      </div>
    </div>
  );
}
