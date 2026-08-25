export interface CategoryItem {
  id: string;
  name: string;
  folder_name: string;
  sort_order: number;
  is_default: boolean;
  created_at: number;
  updated_at: number;
}

const DEFAULT_CATEGORIES: CategoryItem[] = [
  { id: "cat_coding", name: "Coding", folder_name: "Coding", sort_order: 1, is_default: true, created_at: 1700000000000, updated_at: 1700000000000 },
  { id: "cat_marketing", name: "Marketing", folder_name: "Marketing", sort_order: 2, is_default: true, created_at: 1700000000000, updated_at: 1700000000000 },
  { id: "cat_writing", name: "Writing", folder_name: "Writing", sort_order: 3, is_default: true, created_at: 1700000000000, updated_at: 1700000000000 },
  { id: "cat_business", name: "Business", folder_name: "Business", sort_order: 4, is_default: true, created_at: 1700000000000, updated_at: 1700000000000 },
  { id: "cat_youtube", name: "YouTube", folder_name: "YouTube", sort_order: 5, is_default: true, created_at: 1700000000000, updated_at: 1700000000000 },
  { id: "cat_ai", name: "AI", folder_name: "AI", sort_order: 6, is_default: true, created_at: 1700000000000, updated_at: 1700000000000 },
  { id: "cat_productivity", name: "Productivity", folder_name: "Productivity", sort_order: 7, is_default: true, created_at: 1700000000000, updated_at: 1700000000000 },
  { id: "cat_other", name: "Other", folder_name: "Other", sort_order: 8, is_default: true, created_at: 1700000000000, updated_at: 1700000000000 },
];

const STORAGE_KEY = "ai_prompt_library_categories_v1";

function getStoredCategories(): CategoryItem[] {
  if (typeof window === "undefined") return DEFAULT_CATEGORIES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Error reading categories from storage:", e);
  }
  return DEFAULT_CATEGORIES;
}

function saveStoredCategories(cats: CategoryItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cats));
  } catch (e) {
    console.error("Error saving categories to storage:", e);
  }
}

function getElectronCategoryAPI() {
  if (typeof window === "undefined") return null;
  return (window as any).electronAPI?.categories || (window as any).electron?.categories || null;
}

export async function fetchCategories(): Promise<CategoryItem[]> {
  const electronCat = getElectronCategoryAPI();
  if (electronCat && typeof electronCat.getAll === "function") {
    return electronCat.getAll();
  }

  try {
    const res = await fetch("/api/categories");
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.categories) && data.categories.length > 0) {
        saveStoredCategories(data.categories);
        return data.categories;
      }
    }
  } catch {
    // In offline or Vite development mode without Next.js API server
  }

  return getStoredCategories();
}

export async function createCategory(name: string): Promise<{ success: boolean; category?: CategoryItem; error?: string }> {
  const trimmed = name.trim();
  if (!trimmed) {
    return { success: false, error: "Category name cannot be empty." };
  }

  const electronCat = getElectronCategoryAPI();
  if (electronCat && typeof electronCat.create === "function") {
    return electronCat.create(trimmed);
  }

  try {
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.category) {
        const current = getStoredCategories();
        const next = [...current.filter(c => c.id !== data.category.id), data.category];
        saveStoredCategories(next);
        return data;
      }
    }
  } catch {
    // Fallback to local storage
  }

  const current = getStoredCategories();
  const exists = current.some(c => c.name.toLowerCase() === trimmed.toLowerCase());
  if (exists) {
    return { success: false, error: "A category with this name already exists." };
  }

  const newCat: CategoryItem = {
    id: `cat_${Date.now()}`,
    name: trimmed,
    folder_name: trimmed,
    sort_order: current.length + 1,
    is_default: false,
    created_at: Date.now(),
    updated_at: Date.now(),
  };

  const next = [...current, newCat];
  saveStoredCategories(next);
  return { success: true, category: newCat };
}

export async function renameCategory(id: string, newName: string): Promise<{ success: boolean; category?: CategoryItem; error?: string }> {
  const trimmed = newName.trim();
  if (!trimmed) {
    return { success: false, error: "Category name cannot be empty." };
  }

  const electronCat = getElectronCategoryAPI();
  if (electronCat && typeof electronCat.rename === "function") {
    return electronCat.rename(id, trimmed);
  }

  try {
    const res = await fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.category) {
        const current = getStoredCategories();
        const next = current.map(c => c.id === id ? data.category : c);
        saveStoredCategories(next);
        return data;
      }
    }
  } catch {
    // Fallback to local storage
  }

  const current = getStoredCategories();
  const exists = current.some(c => c.id !== id && c.name.toLowerCase() === trimmed.toLowerCase());
  if (exists) {
    return { success: false, error: "A category with this name already exists." };
  }

  let updatedCat: CategoryItem | undefined;
  const next = current.map(c => {
    if (c.id === id) {
      updatedCat = {
        ...c,
        name: trimmed,
        folder_name: trimmed,
        updated_at: Date.now(),
      };
      return updatedCat;
    }
    return c;
  });

  if (!updatedCat) {
    return { success: false, error: "Category not found." };
  }

  saveStoredCategories(next);
  return { success: true, category: updatedCat };
}
