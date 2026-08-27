import { SubcategoryItem } from "@/database/local/subcategoryQueries";
export type { SubcategoryItem };

const STORAGE_KEY = "ai_prompt_library_subcategories_v1";

function getStoredSubcategories(): SubcategoryItem[] {
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
    console.error("Error reading subcategories from storage:", e);
  }
  return [];
}

function saveStoredSubcategories(subcats: SubcategoryItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(subcats));
  } catch (e) {
    console.error("Error saving subcategories to storage:", e);
  }
}

function getElectronSubcategoryAPI() {
  if (typeof window === "undefined") return null;
  return (window as any).electronAPI?.subcategories || (window as any).electron?.subcategories || null;
}

export async function fetchSubcategories(categoryId?: string): Promise<SubcategoryItem[]> {
  const electronSubcat = getElectronSubcategoryAPI();
  if (electronSubcat && typeof electronSubcat.getAll === "function") {
    return electronSubcat.getAll(categoryId);
  }

  try {
    const url = categoryId ? `/api/subcategories?categoryId=${encodeURIComponent(categoryId)}` : "/api/subcategories";
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.subcategories)) {
        if (!categoryId) {
          saveStoredSubcategories(data.subcategories);
        }
        return data.subcategories;
      }
    }
  } catch {
    // Offline mode / SPA fallback
  }

  const all = getStoredSubcategories();
  if (categoryId) {
    return all.filter((s) => s.category_id === categoryId);
  }
  return all;
}

export async function createSubcategory(
  categoryId: string,
  name: string,
  description?: string
): Promise<{ success: boolean; subcategory?: SubcategoryItem; error?: string }> {
  const trimmed = name.trim();
  if (!trimmed) {
    return { success: false, error: "Subcategory name cannot be empty." };
  }
  if (!categoryId || !categoryId.trim()) {
    return { success: false, error: "Parent category is required." };
  }

  const electronSubcat = getElectronSubcategoryAPI();
  if (electronSubcat && typeof electronSubcat.create === "function") {
    return electronSubcat.create(categoryId, trimmed, description);
  }

  try {
    const res = await fetch("/api/subcategories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId, name: trimmed, description }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.subcategory) {
        const current = getStoredSubcategories();
        const next = [...current.filter((s) => s.id !== data.subcategory.id), data.subcategory];
        saveStoredSubcategories(next);
        return data;
      }
    }
  } catch {
    // Fallback to local storage
  }

  const current = getStoredSubcategories();
  const exists = current.some(
    (s) => s.category_id === categoryId && s.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (exists) {
    return { success: false, error: "A subcategory with this name already exists under this category." };
  }

  const now = Date.now();
  const newSubcat: SubcategoryItem = {
    id: `subcat_${now}_${Math.random().toString(36).slice(2, 7)}`,
    category_id: categoryId,
    name: trimmed,
    description: description?.trim() || null,
    sort_order: current.filter((s) => s.category_id === categoryId).length + 1,
    created_at: now,
    updated_at: now,
  };

  const next = [...current, newSubcat];
  saveStoredSubcategories(next);
  return { success: true, subcategory: newSubcat };
}

export async function updateSubcategory(
  id: string,
  name: string,
  description?: string
): Promise<{ success: boolean; subcategory?: SubcategoryItem; error?: string }> {
  const trimmed = name.trim();
  if (!trimmed) {
    return { success: false, error: "Subcategory name cannot be empty." };
  }

  const electronSubcat = getElectronSubcategoryAPI();
  if (electronSubcat && typeof electronSubcat.update === "function") {
    return electronSubcat.update(id, trimmed, description);
  }

  try {
    const res = await fetch(`/api/subcategories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed, description }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.subcategory) {
        const current = getStoredSubcategories();
        const next = current.map((s) => (s.id === id ? data.subcategory : s));
        saveStoredSubcategories(next);
        return data;
      }
    }
  } catch {
    // Fallback
  }

  const current = getStoredSubcategories();
  const target = current.find((s) => s.id === id);
  if (!target) {
    return { success: false, error: "Subcategory not found." };
  }

  const duplicate = current.some(
    (s) => s.id !== id && s.category_id === target.category_id && s.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (duplicate) {
    return { success: false, error: "A subcategory with this name already exists under this category." };
  }

  const updatedSubcat: SubcategoryItem = {
    ...target,
    name: trimmed,
    description: description !== undefined ? description?.trim() || null : target.description,
    updated_at: Date.now(),
  };

  const next = current.map((s) => (s.id === id ? updatedSubcat : s));
  saveStoredSubcategories(next);
  return { success: true, subcategory: updatedSubcat };
}

export async function countPromptsInSubcategory(id: string): Promise<number> {
  const electronSubcat = getElectronSubcategoryAPI();
  if (electronSubcat && typeof electronSubcat.countPrompts === "function") {
    return electronSubcat.countPrompts(id);
  }

  try {
    const res = await fetch(`/api/subcategories/${id}/count`);
    if (res.ok) {
      const data = await res.json();
      if (typeof data.count === "number") {
        return data.count;
      }
    }
  } catch {
    // Fallback
  }

  // Check stored prompts if in local mode
  try {
    const raw = localStorage.getItem("ai_prompt_library_prompts_v1");
    if (raw) {
      const prompts = JSON.parse(raw);
      if (Array.isArray(prompts)) {
        return prompts.filter((p: any) => p.subcategory_id === id).length;
      }
    }
  } catch {}

  return 0;
}

export async function deleteSubcategory(
  id: string
): Promise<{ success: boolean; countPromptsAffected?: number; error?: string }> {
  const electronSubcat = getElectronSubcategoryAPI();
  if (electronSubcat && typeof electronSubcat.delete === "function") {
    return electronSubcat.delete(id);
  }

  try {
    const res = await fetch(`/api/subcategories/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        const current = getStoredSubcategories();
        saveStoredSubcategories(current.filter((s) => s.id !== id));
        return data;
      }
    }
  } catch {
    // Fallback
  }

  const current = getStoredSubcategories();
  const promptCount = await countPromptsInSubcategory(id);

  // Detach from local prompts
  try {
    const raw = localStorage.getItem("ai_prompt_library_prompts_v1");
    if (raw) {
      const prompts = JSON.parse(raw);
      if (Array.isArray(prompts)) {
        const updatedPrompts = prompts.map((p: any) => {
          if (p.subcategory_id === id) {
            const copy = { ...p };
            delete copy.subcategory_id;
            delete copy.subcategory_name;
            return copy;
          }
          return p;
        });
        localStorage.setItem("ai_prompt_library_prompts_v1", JSON.stringify(updatedPrompts));
      }
    }
  } catch {}

  saveStoredSubcategories(current.filter((s) => s.id !== id));
  return { success: true, countPromptsAffected: promptCount };
}
