"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Search, Sparkles, BookOpen, ShieldCheck, Briefcase, ArrowRight, CheckCircle2 } from "lucide-react";

interface EmojiPickerPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (emojiOrIcon: string) => void;
}

interface CategoryItem {
  icon: string;
  keywords: string[];
}

interface IconCategory {
  id: string;
  name: string;
  categoryIcon: React.ElementType;
  items: CategoryItem[];
}

const ICON_CATEGORIES: IconCategory[] = [
  {
    id: "ai-tech",
    name: "AI & Tech",
    categoryIcon: Sparkles,
    items: [
      { icon: "🤖", keywords: ["robot", "ai", "bot", "assistant", "agent"] },
      { icon: "🧠", keywords: ["brain", "intelligence", "mind", "think", "neural"] },
      { icon: "✨", keywords: ["sparkles", "magic", "clean", "ai", "enhance"] },
      { icon: "⚡", keywords: ["zap", "fast", "lightning", "speed", "power"] },
      { icon: "🔮", keywords: ["crystal", "future", "predict", "oracle", "model"] },
      { icon: "💡", keywords: ["idea", "bulb", "light", "insight", "tip"] },
      { icon: "🚀", keywords: ["rocket", "launch", "fast", "deploy", "speed"] },
      { icon: "💻", keywords: ["laptop", "computer", "code", "dev", "tech"] },
      { icon: "🔥", keywords: ["fire", "hot", "popular", "burn", "trend"] },
      { icon: "⚙️", keywords: ["gear", "settings", "engine", "config", "tool"] },
      { icon: "🛠️", keywords: ["tools", "build", "maintain", "fix", "repair"] },
      { icon: "🎯", keywords: ["target", "goal", "accuracy", "focus", "aim"] },
      { icon: "📊", keywords: ["chart", "analytics", "graph", "stats", "data"] },
      { icon: "📈", keywords: ["growth", "up", "chart", "increase", "metrics"] },
      { icon: "🧩", keywords: ["puzzle", "plugin", "module", "component", "piece"] },
      { icon: "📡", keywords: ["satellite", "network", "signal", "broadcast", "api"] },
      { icon: "🌐", keywords: ["globe", "world", "web", "internet", "online"] },
      { icon: "🔒", keywords: ["lock", "security", "private", "secure", "safe"] },
      { icon: "🧬", keywords: ["dna", "science", "generation", "prompt", "origin"] },
      { icon: "🧪", keywords: ["test", "experiment", "lab", "trial", "science"] },
    ],
  },
  {
    id: "prompts-writing",
    name: "Prompts & Writing",
    categoryIcon: BookOpen,
    items: [
      { icon: "✍️", keywords: ["write", "author", "compose", "draft", "pencil"] },
      { icon: "📝", keywords: ["memo", "note", "document", "prompt", "record"] },
      { icon: "📄", keywords: ["page", "document", "file", "paper", "text"] },
      { icon: "📜", keywords: ["scroll", "script", "rules", "instructions", "system"] },
      { icon: "📚", keywords: ["books", "library", "catalog", "knowledge", "docs"] },
      { icon: "🔖", keywords: ["bookmark", "tag", "saved", "favorite", "label"] },
      { icon: "📌", keywords: ["pin", "pinned", "notice", "important", "marker"] },
      { icon: "🎨", keywords: ["palette", "art", "creative", "style", "design"] },
      { icon: "🖋️", keywords: ["pen", "ink", "writing", "formal", "signature"] },
      { icon: "📖", keywords: ["book", "open", "read", "story", "manual"] },
      { icon: "📋", keywords: ["clipboard", "checklist", "copy", "paste", "task"] },
      { icon: "📂", keywords: ["folder", "category", "directory", "organize", "files"] },
      { icon: "🔍", keywords: ["search", "find", "explore", "lookup", "query"] },
      { icon: "🔎", keywords: ["zoom", "inspect", "investigate", "audit", "detail"] },
      { icon: "🗣️", keywords: ["speech", "voice", "dialogue", "talk", "persona"] },
      { icon: "💬", keywords: ["chat", "message", "conversation", "response", "reply"] },
      { icon: "💭", keywords: ["thought", "reasoning", "cot", "thinking", "ponder"] },
      { icon: "🏷️", keywords: ["label", "tag", "meta", "version", "pricing"] },
      { icon: "⭐", keywords: ["star", "favorite", "rate", "gold", "starred"] },
      { icon: "🌟", keywords: ["glow", "star", "featured", "special", "top"] },
    ],
  },
  {
    id: "status-badges",
    name: "Status & Badges",
    categoryIcon: ShieldCheck,
    items: [
      { icon: "✅", keywords: ["check", "success", "pass", "done", "verified"] },
      { icon: "❌", keywords: ["cross", "fail", "error", "rejected", "no"] },
      { icon: "⚠️", keywords: ["warning", "alert", "caution", "notice", "warn"] },
      { icon: "🚨", keywords: ["siren", "emergency", "urgent", "critical", "danger"] },
      { icon: "🟢", keywords: ["green", "online", "active", "live", "ok"] },
      { icon: "🟡", keywords: ["yellow", "pending", "idle", "waiting", "pause"] },
      { icon: "🔴", keywords: ["red", "offline", "stopped", "failed", "danger"] },
      { icon: "🔵", keywords: ["blue", "info", "system", "sync", "processing"] },
      { icon: "🟣", keywords: ["purple", "custom", "pro", "special", "badge"] },
      { icon: "✔️", keywords: ["check", "done", "tick", "confirmed", "true"] },
      { icon: "❓", keywords: ["question", "help", "faq", "unknown", "query"] },
      { icon: "❗", keywords: ["exclamation", "important", "alert", "notice", "bang"] },
      { icon: "🏆", keywords: ["trophy", "winner", "best", "award", "rank"] },
      { icon: "🥇", keywords: ["first", "gold", "medal", "top", "leader"] },
      { icon: "💯", keywords: ["hundred", "perfect", "score", "complete", "full"] },
      { icon: "⏳", keywords: ["hourglass", "wait", "pending", "time", "loading"] },
      { icon: "⏱️", keywords: ["timer", "stopwatch", "latency", "benchmark", "speed"] },
      { icon: "🔄", keywords: ["refresh", "sync", "reload", "update", "loop"] },
      { icon: "⛔", keywords: ["prohibited", "stop", "restricted", "blocked", "no"] },
      { icon: "🔔", keywords: ["bell", "notification", "alert", "reminder", "ring"] },
    ],
  },
  {
    id: "business-finance",
    name: "Business & Finance",
    categoryIcon: Briefcase,
    items: [
      { icon: "💼", keywords: ["briefcase", "work", "business", "job", "career"] },
      { icon: "🏢", keywords: ["office", "company", "enterprise", "building", "corp"] },
      { icon: "📈", keywords: ["growth", "trend", "bull", "increase", "revenue"] },
      { icon: "📉", keywords: ["drop", "decrease", "bear", "loss", "decline"] },
      { icon: "💰", keywords: ["money", "cash", "budget", "finance", "dollars"] },
      { icon: "💳", keywords: ["card", "credit", "payment", "subscription", "pay"] },
      { icon: "🤝", keywords: ["handshake", "deal", "partner", "agreement", "contract"] },
      { icon: "📅", keywords: ["calendar", "date", "schedule", "plan", "event"] },
      { icon: "🗓️", keywords: ["calendar", "planner", "agenda", "timeline", "due"] },
      { icon: "🗂️", keywords: ["index", "organize", "files", "database", "archive"] },
      { icon: "📑", keywords: ["tabs", "documents", "reports", "sheets", "paper"] },
      { icon: "🎖️", keywords: ["medal", "award", "tier", "achievement", "honor"] },
      { icon: "👑", keywords: ["crown", "vip", "premium", "admin", "owner"] },
      { icon: "💎", keywords: ["diamond", "gem", "valuable", "high-quality", "tier"] },
      { icon: "🔑", keywords: ["key", "auth", "token", "access", "permission"] },
      { icon: "🛡️", keywords: ["shield", "protect", "defense", "secure", "firewall"] },
    ],
  },
  {
    id: "arrows-navigation",
    name: "Arrows & Navigation",
    categoryIcon: ArrowRight,
    items: [
      { icon: "➡️", keywords: ["right", "arrow", "next", "forward", "proceed"] },
      { icon: "⬅️", keywords: ["left", "arrow", "back", "previous", "return"] },
      { icon: "⬆️", keywords: ["up", "arrow", "top", "increase", "above"] },
      { icon: "⬇️", keywords: ["down", "arrow", "bottom", "decrease", "below"] },
      { icon: "↗️", keywords: ["up-right", "arrow", "external", "link", "growth"] },
      { icon: "↘️", keywords: ["down-right", "arrow", "sub", "branch", "drop"] },
      { icon: "↙️", keywords: ["down-left", "arrow", "receive", "inward"] },
      { icon: "↖️", keywords: ["up-left", "arrow", "origin", "source"] },
      { icon: "↕️", keywords: ["vertical", "arrow", "sort", "both", "range"] },
      { icon: "↔️", keywords: ["horizontal", "arrow", "transfer", "exchange", "both"] },
      { icon: "➔", keywords: ["arrow", "pointer", "lead", "goto", "right"] },
      { icon: "▶️", keywords: ["play", "run", "execute", "start", "action"] },
      { icon: "◀️", keywords: ["rewind", "back", "reverse", "prior"] },
      { icon: "⏩", keywords: ["fast-forward", "skip", "accelerate", "speed"] },
      { icon: "⏪", keywords: ["fast-rewind", "history", "backtrack", "replay"] },
      { icon: "👉", keywords: ["point-right", "look", "attention", "this", "direction"] },
      { icon: "👈", keywords: ["point-left", "back", "check-left", "source"] },
      { icon: "👆", keywords: ["point-up", "above", "top-note", "header"] },
      { icon: "👇", keywords: ["point-down", "below", "following", "code-below"] },
    ],
  },
  {
    id: "checkmarks-symbols",
    name: "Checkmarks & Symbols",
    categoryIcon: CheckCircle2,
    items: [
      { icon: "✔️", keywords: ["check", "tick", "verified", "true", "done"] },
      { icon: "✅", keywords: ["check-box", "passed", "complete", "success"] },
      { icon: "☑️", keywords: ["checkbox", "ticked", "marked", "selected"] },
      { icon: "🔘", keywords: ["radio", "bullet", "option", "selected", "dot"] },
      { icon: "▪️", keywords: ["square", "black", "bullet", "small", "point"] },
      { icon: "▫️", keywords: ["square", "white", "bullet", "empty", "point"] },
      { icon: "•", keywords: ["bullet", "dot", "list", "marker", "point"] },
      { icon: "✦", keywords: ["four-point-star", "sparkle", "special", "accent"] },
      { icon: "★", keywords: ["star", "solid", "favorite", "important", "rating"] },
      { icon: "✪", keywords: ["star-circle", "badge", "certified", "featured"] },
      { icon: "🔷", keywords: ["diamond", "blue", "marker", "point", "bullet"] },
      { icon: "🔶", keywords: ["diamond", "orange", "marker", "point", "bullet"] },
      { icon: "🔺", keywords: ["triangle-up", "increase", "high", "top"] },
      { icon: "🔻", keywords: ["triangle-down", "decrease", "low", "bottom"] },
      { icon: "💠", keywords: ["diamond-dot", "flower", "accent", "icon"] },
      { icon: "※", keywords: ["reference", "note", "footnote", "mark"] },
    ],
  },
];

export function EmojiPickerPopover({ isOpen, onClose, onSelect }: EmojiPickerPopoverProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Filtered categories based on search and active tab
  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase();

    return ICON_CATEGORIES.map((cat) => {
      if (activeCategory !== "all" && cat.id !== activeCategory) {
        return { ...cat, items: [] };
      }

      if (!query) {
        return cat;
      }

      const matchingItems = cat.items.filter((item) =>
        item.icon.includes(query) || item.keywords.some((k) => k.toLowerCase().includes(query))
      );

      return { ...cat, items: matchingItems };
    }).filter((cat) => cat.items.length > 0);
  }, [search, activeCategory]);

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      className="absolute top-12 left-0 z-50 w-80 p-3.5 rounded-2xl bg-card border border-border shadow-2xl shadow-black/20 text-left animate-in fade-in zoom-in-95 duration-150 select-none"
    >
      {/* Search Input */}
      <div className="relative mb-2.5">
        <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search icons (e.g. robot, star, arrow)..."
          className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground/60"
          autoFocus
        />
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-2 border-b border-border/50 scrollbar-none text-[11px]">
        <button
          type="button"
          onClick={() => setActiveCategory("all")}
          className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-colors cursor-pointer ${
            activeCategory === "all"
              ? "bg-primary text-primary-foreground shadow-2xs"
              : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          All
        </button>
        {ICON_CATEGORIES.map((cat) => {
          const CatIcon = cat.categoryIcon;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-2 py-1 rounded-lg font-medium shrink-0 transition-colors cursor-pointer flex items-center gap-1 ${
                activeCategory === cat.id
                  ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              title={cat.name}
            >
              <CatIcon className="h-3 w-3" />
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Icons Grid */}
      <div className="max-h-64 overflow-y-auto space-y-3 scrollbar-thin pr-1">
        {filteredCategories.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No icons found for &ldquo;{search}&rdquo;
          </div>
        ) : (
          filteredCategories.map((cat) => (
            <div key={cat.id} className="space-y-1.5">
              <div className="flex items-center gap-1.5 px-1">
                <cat.categoryIcon className="h-3 w-3 text-primary" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  {cat.name}
                </span>
                <span className="text-[10px] text-muted-foreground/50 font-mono ml-auto">
                  {cat.items.length}
                </span>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {cat.items.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    title={item.keywords.join(", ")}
                    onClick={() => {
                      onSelect(item.icon);
                      onClose();
                    }}
                    className="h-8 w-8 rounded-lg hover:bg-muted text-base flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer bg-background/50 border border-border/30 hover:border-border"
                  >
                    {item.icon}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
