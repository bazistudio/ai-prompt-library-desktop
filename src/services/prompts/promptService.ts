import { getStoragePath, savePromptMarkdownToDisk } from "@/services/storage/storageService";

export interface PromptVersion {
  id: string;
  version_number: number;
  content: string;
  change_summary?: string;
  created_at: number;
}

export interface PromptItem {
  id: string;
  title: string;
  description?: string;
  category: string;
  category_id?: string;
  project_id?: string;
  project_name?: string;
  project_color?: string;
  is_favorite: boolean;
  is_archived: boolean;
  current_version: number;
  created_at: number;
  updated_at: number;
  current_content?: string;
  tags: string[];
  text_direction?: "ltr" | "rtl" | "auto";
  language?: string;
  versions?: PromptVersion[];
}

export interface CreatePromptInput {
  title: string;
  description?: string;
  category?: string;
  categoryId?: string;
  projectId?: string;
  tags?: string[];
  content: string;
  textDirection?: "ltr" | "rtl" | "auto";
  language?: string;
}

export interface AddVersionInput {
  promptId: string;
  content: string;
  changeSummary?: string;
}

export interface UpdateMetaInput {
  promptId: string;
  title?: string;
  description?: string;
  category?: string;
  categoryId?: string;
  projectId?: string;
  tags?: string[];
  textDirection?: "ltr" | "rtl" | "auto";
  language?: string;
}

export interface GetPromptsOptions {
  category?: string;
  categoryId?: string;
  projectId?: string;
  search?: string;
  favoriteOnly?: boolean;
}

const STORAGE_KEY = "ai_prompt_library_prompts_v1";

function getStoredPrompts(): PromptItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Error reading prompts from localStorage:", e);
  }
  return [];
}

function saveStoredPrompts(prompts: PromptItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
  } catch (e) {
    console.error("Error saving prompts to localStorage:", e);
  }
}

function isElectron(): boolean {
  return typeof window !== "undefined" && Boolean((window as any).electron?.prompts);
}

export async function fetchPrompts(options: GetPromptsOptions = {}): Promise<PromptItem[]> {
  if (isElectron()) {
    return (window as any).electron.prompts.getAll(options);
  }

  try {
    const params = new URLSearchParams();
    if (options.projectId) params.set("projectId", options.projectId);
    if (options.categoryId) params.set("categoryId", options.categoryId);
    if (options.category) params.set("category", options.category);
    if (options.search) params.set("search", options.search);
    if (options.favoriteOnly) params.set("favoriteOnly", "true");

    const res = await fetch(`/api/desktop-prompts?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.prompts)) {
        saveStoredPrompts(data.prompts);
        return data.prompts;
      }
    }
  } catch {
    // Offline mode
  }

  let prompts = getStoredPrompts();
  if (options.favoriteOnly) {
    prompts = prompts.filter((p) => p.is_favorite);
  }
  if (options.category && options.category !== "All") {
    prompts = prompts.filter((p) => p.category.toLowerCase() === options.category?.toLowerCase());
  }
  if (options.projectId) {
    prompts = prompts.filter((p) => p.project_id === options.projectId);
  }
  if (options.search && options.search.trim()) {
    const q = options.search.toLowerCase().trim();
    prompts = prompts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.tags && p.tags.some((t) => t.toLowerCase().includes(q))) ||
        (p.current_content && p.current_content.toLowerCase().includes(q))
    );
  }

  // Sort by updated_at descending
  return prompts.sort((a, b) => b.updated_at - a.updated_at);
}

export async function fetchPromptById(id: string): Promise<PromptItem> {
  if (isElectron()) {
    return (window as any).electron.prompts.getById(id);
  }

  try {
    const res = await fetch(`/api/desktop-prompts/${id}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.prompt) {
        return data.prompt;
      }
    }
  } catch {
    // Offline mode
  }

  const prompts = getStoredPrompts();
  const found = prompts.find((p) => p.id === id);
  if (!found) {
    throw new Error("Prompt not found in library.");
  }
  return found;
}

export async function createPrompt(input: CreatePromptInput): Promise<{ success: boolean; promptId: string; error?: string }> {
  if (isElectron()) {
    return (window as any).electron.prompts.create(input);
  }

  try {
    const res = await fetch("/api/desktop-prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.promptId) {
        return data;
      }
    }
  } catch {
    // Offline mode
  }

  const now = Date.now();
  const id = `prompt_${now}_${Math.random().toString(36).slice(2, 7)}`;
  
  const initialVersion: PromptVersion = {
    id: `ver_${now}_1`,
    version_number: 1,
    content: input.content,
    change_summary: "Initial Version v1",
    created_at: now,
  };

  const newPrompt: PromptItem = {
    id,
    title: input.title.trim(),
    description: input.description?.trim() || undefined,
    category: input.category || "General",
    category_id: input.categoryId,
    project_id: input.projectId || "proj_default",
    is_favorite: false,
    is_archived: false,
    current_version: 1,
    current_content: input.content,
    tags: input.tags || [],
    text_direction: input.textDirection || "auto",
    language: input.language || "auto",
    created_at: now,
    updated_at: now,
    versions: [initialVersion],
  };

  const currentPrompts = getStoredPrompts();
  const nextPrompts = [newPrompt, ...currentPrompts];
  saveStoredPrompts(nextPrompts);

  // Save Markdown file to physical user storage directory if configured
  try {
    const storagePath = await getStoragePath();
    if (storagePath) {
      await savePromptMarkdownToDisk(
        storagePath,
        input.category || "General",
        id,
        input.title,
        input.content
      );
    }
  } catch (err) {
    console.warn("[promptService] Failed to write prompt to physical storage:", err);
  }

  return { success: true, promptId: id };
}

export async function addPromptVersion(input: AddVersionInput): Promise<{ success: boolean; versionNumber: number; error?: string }> {
  if (isElectron()) {
    return (window as any).electron.prompts.addVersion(input);
  }

  try {
    const res = await fetch(`/api/desktop-prompts/${input.promptId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "addVersion", ...input }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        return data;
      }
    }
  } catch {
    // Offline mode
  }

  const prompts = getStoredPrompts();
  const index = prompts.findIndex((p) => p.id === input.promptId);
  if (index === -1) {
    throw new Error("Prompt not found.");
  }

  const prompt = prompts[index];
  const currentVersions = prompt.versions || [];
  
  // Guard: if content is identical to current version content, return current version without creating duplicate
  const latestVer = currentVersions[currentVersions.length - 1];
  if (latestVer && latestVer.content.trim() === input.content.trim()) {
    return { success: true, versionNumber: prompt.current_version };
  }

  const now = Date.now();
  const nextVersionNum = (prompt.current_version || 1) + 1;
  const newVersion: PromptVersion = {
    id: `ver_${now}_${nextVersionNum}`,
    version_number: nextVersionNum,
    content: input.content,
    change_summary: input.changeSummary || `Version v${nextVersionNum}`,
    created_at: now,
  };

  const updatedPrompt: PromptItem = {
    ...prompt,
    current_version: nextVersionNum,
    current_content: input.content,
    updated_at: now,
    versions: [...currentVersions, newVersion],
  };

  prompts[index] = updatedPrompt;
  saveStoredPrompts(prompts);

  // Save updated Markdown file to physical user storage directory
  try {
    const storagePath = await getStoragePath();
    if (storagePath) {
      await savePromptMarkdownToDisk(
        storagePath,
        updatedPrompt.category || "General",
        updatedPrompt.id,
        updatedPrompt.title,
        updatedPrompt.current_content || input.content
      );
    }
  } catch (err) {
    console.warn("[promptService] Failed to write updated prompt to physical storage:", err);
  }

  return { success: true, versionNumber: nextVersionNum };
}

export async function updatePromptMeta(input: UpdateMetaInput): Promise<{ success: boolean }> {
  if (isElectron()) {
    return (window as any).electron.prompts.updateMeta(input);
  }

  try {
    const res = await fetch(`/api/desktop-prompts/${input.promptId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "updateMeta", ...input }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        return data;
      }
    }
  } catch {
    // Offline mode
  }

  const prompts = getStoredPrompts();
  const index = prompts.findIndex((p) => p.id === input.promptId);
  if (index === -1) {
    throw new Error("Prompt not found.");
  }

  const prompt = prompts[index];
  const now = Date.now();
  prompts[index] = {
    ...prompt,
    title: input.title !== undefined ? input.title.trim() : prompt.title,
    description: input.description !== undefined ? input.description.trim() : prompt.description,
    category: input.category !== undefined ? input.category : prompt.category,
    category_id: input.categoryId !== undefined ? input.categoryId : prompt.category_id,
    project_id: input.projectId !== undefined ? input.projectId : prompt.project_id,
    tags: input.tags !== undefined ? input.tags : prompt.tags,
    text_direction: input.textDirection !== undefined ? input.textDirection : prompt.text_direction,
    language: input.language !== undefined ? input.language : prompt.language,
    updated_at: now,
  };

  saveStoredPrompts(prompts);
  return { success: true };
}

export async function toggleFavorite(id: string): Promise<{ success: boolean; is_favorite: boolean }> {
  if (isElectron()) {
    return (window as any).electron.prompts.toggleFavorite(id);
  }

  try {
    const res = await fetch(`/api/desktop-prompts/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggleFavorite" }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        return data;
      }
    }
  } catch {
    // Offline mode
  }

  const prompts = getStoredPrompts();
  const index = prompts.findIndex((p) => p.id === id);
  if (index === -1) {
    throw new Error("Prompt not found.");
  }

  const nextFav = !prompts[index].is_favorite;
  prompts[index] = {
    ...prompts[index],
    is_favorite: nextFav,
    updated_at: Date.now(),
  };

  saveStoredPrompts(prompts);
  return { success: true, is_favorite: nextFav };
}

export async function fetchPromptStats(): Promise<{
  totalPrompts: number;
  favoritePrompts: number;
  totalCategories: number;
  totalVersions: number;
  recentPrompts: Array<{
    id: string;
    title: string;
    description?: string;
    category: string;
    current_version: number;
    is_favorite: boolean;
    updated_at: number;
  }>;
}> {
  if (isElectron()) {
    return (window as any).electron.prompts.getStats();
  }

  try {
    const res = await fetch("/api/desktop-prompts?stats=true");
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.stats) {
        return data.stats;
      }
    }
  } catch {
    // Offline mode
  }

  const prompts = getStoredPrompts();
  const totalPrompts = prompts.length;
  const favoritePrompts = prompts.filter((p) => p.is_favorite).length;
  
  const uniqueCats = new Set(prompts.map((p) => p.category));
  const totalCategories = Math.max(8, uniqueCats.size);
  
  const totalVersions = prompts.reduce((acc, p) => acc + (p.versions?.length || p.current_version || 1), 0);

  const sorted = [...prompts].sort((a, b) => b.updated_at - a.updated_at);
  const recentPrompts = sorted.slice(0, 5).map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    category: p.category,
    current_version: p.current_version,
    is_favorite: p.is_favorite,
    updated_at: p.updated_at,
  }));

  return {
    totalPrompts,
    favoritePrompts,
    totalCategories,
    totalVersions,
    recentPrompts,
  };
}

export async function deletePrompt(id: string): Promise<{ success: boolean }> {
  if (isElectron()) {
    return (window as any).electron.prompts.delete(id);
  }

  try {
    const res = await fetch(`/api/desktop-prompts/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        return data;
      }
    }
  } catch {
    // Offline mode
  }

  const prompts = getStoredPrompts();
  const nextPrompts = prompts.filter((p) => p.id !== id);
  saveStoredPrompts(nextPrompts);
  return { success: true };
}
