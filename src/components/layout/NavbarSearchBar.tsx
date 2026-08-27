"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  FileText,
  X,
  Loader2,
} from "lucide-react";
import { PromptItem, fetchPrompts } from "@/services/prompts/promptService";

export function NavbarSearchBar() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Load prompts for fast in-memory indexing
  const loadPrompts = () => {
    if (prompts.length > 0) return;
    setLoading(true);
    fetchPrompts()
      .then((data) => {
        if (Array.isArray(data)) {
          setPrompts(data);
        }
      })
      .catch((err) => console.error("Failed to load prompts for search:", err))
      .finally(() => setLoading(false));
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Global Ctrl+K hotkey to focus Navbar search bar
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        inputRef.current?.focus();
        loadPrompts();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // Only filter and show results when user has typed search query
  const filteredPrompts = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) {
      return [];
    }

    return prompts
      .filter((p) => {
        const titleMatch = p.title?.toLowerCase().includes(q);
        const categoryMatch = p.category?.toLowerCase().includes(q);
        const subcategoryMatch = p.subcategory_name
          ? p.subcategory_name.toLowerCase().includes(q)
          : false;
        const tagsMatch = Array.isArray(p.tags)
          ? p.tags.some((t) => t.toLowerCase().includes(q))
          : false;
        const descMatch = p.description ? p.description.toLowerCase().includes(q) : false;

        return titleMatch || categoryMatch || subcategoryMatch || tagsMatch || descMatch;
      })
      .slice(0, 8);
  }, [query, prompts]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredPrompts.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen && filteredPrompts.length > 0 && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setIsOpen(true);
      return;
    }

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
        setIsOpen(false);
        inputRef.current?.blur();
      } else if (query.trim()) {
        navigate(`/prompts?search=${encodeURIComponent(query.trim())}`);
        setIsOpen(false);
        inputRef.current?.blur();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      inputRef.current?.blur();
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
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const hasTypedQuery = query.trim().length > 0;

  return (
    <div ref={containerRef} className="relative w-full max-w-sm lg:max-w-md">
      {/* Standard Search Input Box */}
      <div className="relative flex items-center">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
          <Search className="h-4 w-4" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={() => {
            loadPrompts();
            if (hasTypedQuery) setIsOpen(true);
          }}
          onChange={(e) => {
            const val = e.target.value;
            setQuery(val);
            setIsOpen(val.trim().length > 0);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search prompts by title, category, tags..."
          className="w-full pl-9 pr-14 py-1.5 sm:py-2 rounded-xl border border-border bg-card/70 hover:bg-card focus:bg-background text-xs sm:text-sm text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all shadow-2xs"
        />

        {/* Clear Button / Shortcut Badge */}
        <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setIsOpen(false);
                inputRef.current?.focus();
              }}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-medium text-muted-foreground bg-muted border border-border rounded pointer-events-none">
              Ctrl+K
            </kbd>
          )}
        </div>
      </div>

      {/* Results Dropdown Only Shown When Actively Typing Query */}
      {isOpen && hasTypedQuery && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden max-h-72 flex flex-col animate-in fade-in duration-100">
          <div ref={listRef} className="overflow-y-auto flex-1 p-1 space-y-0.5">
            {loading ? (
              <div className="py-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span>Searching...</span>
              </div>
            ) : filteredPrompts.length === 0 ? (
              <div className="py-3 text-center text-xs text-muted-foreground">
                No matching prompts found
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
                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors text-left text-xs ${
                      isSelected
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "text-foreground hover:bg-muted/70"
                    }`}
                  >
                    {/* Left: Icon + Title */}
                    <div className="flex items-center gap-2 truncate min-w-0 pr-2">
                      <FileText
                        className={`h-3.5 w-3.5 shrink-0 ${
                          isSelected ? "text-primary-foreground" : "text-primary"
                        }`}
                      />
                      <span className="truncate">{prompt.title}</span>
                    </div>

                    {/* Right: Category › Subcategory Pill */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-medium truncate max-w-[130px] ${
                          isSelected
                            ? "bg-primary-foreground/20 text-primary-foreground"
                            : "bg-secondary text-muted-foreground border border-border/60"
                        }`}
                      >
                        {prompt.category}
                        {prompt.subcategory_name ? ` › ${prompt.subcategory_name}` : ""}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
