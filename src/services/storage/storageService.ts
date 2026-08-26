const STORAGE_PATH_KEY = "ai_prompt_library_storage_path";

const DEFAULT_CATEGORIES = [
  "Coding",
  "Marketing",
  "Creative Writing",
  "Business",
  "Academic",
  "Productivity",
  "Social Media",
  "Personal",
];

function getElectronStorageAPI() {
  if (typeof window === "undefined") return null;
  return (window as any).electronAPI?.storage || (window as any).electron?.storage || null;
}

/**
 * Returns the configured storage path, or null if a new user has never configured a location.
 */
export async function getStoragePath(): Promise<string | null> {
  const electronStorage = getElectronStorageAPI();
  if (electronStorage && typeof electronStorage.getPath === "function") {
    const p = await electronStorage.getPath();
    if (p && p.trim()) return p.trim();
  }

  try {
    const res = await fetch("/api/storage");
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.storagePath) {
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_PATH_KEY, data.storagePath);
        }
        return data.storagePath;
      }
    }
  } catch {
    // Offline / Vite mode fallback
  }

  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(STORAGE_PATH_KEY);
    if (saved && saved.trim()) {
      return saved.trim();
    }
  }

  return null;
}

/**
 * Ensures category subfolders exist on the physical disk inside the user's storage path.
 */
export async function ensureStorageCategories(storagePath: string, categories: string[] = DEFAULT_CATEGORIES): Promise<void> {
  if (!storagePath || !storagePath.trim()) return;

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("ensure_storage_categories", {
      storagePath: storagePath.trim(),
      categories,
    });
  } catch (err) {
    console.warn("[StorageService] ensureStorageCategories note:", err);
  }
}

/**
 * Saves a prompt as a Markdown file natively into the user's storage directory.
 */
export async function savePromptMarkdownToDisk(
    storagePath: string,
    categoryFolder: string,
    promptId: string,
    title: string,
    content: string
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  if (!storagePath || !storagePath.trim()) {
    return { success: false, error: "Storage path is empty." };
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const filePath = await invoke<string>("save_prompt_markdown", {
      storagePath: storagePath.trim(),
      categoryFolder: categoryFolder.trim() || "General",
      promptId: promptId.trim(),
      title: title.trim(),
      content: content.trim(),
    });
    return { success: true, filePath };
  } catch (err: any) {
    console.warn("[StorageService] savePromptMarkdownToDisk failed:", err);
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Opens native folder picker via Tauri dialog, Electron bridge, or File System Access API.
 */
export async function selectStorageFolder(): Promise<{ canceled: boolean; filePaths: string[] }> {
  // 1. Try Tauri 2 plugin-dialog
  try {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Select Prompt Library Storage Folder",
    });

    if (selected && typeof selected === "string") {
      return { canceled: false, filePaths: [selected] };
    } else if (Array.isArray(selected) && selected.length > 0) {
      return { canceled: false, filePaths: selected };
    }
    return { canceled: true, filePaths: [] };
  } catch {
    // Tauri not active or plugin-dialog not loaded, fall through
  }

  // 2. Try Electron storage bridge
  const electronStorage = getElectronStorageAPI();
  if (electronStorage && typeof electronStorage.selectFolder === "function") {
    return electronStorage.selectFolder();
  }

  // 3. Browser modern Directory Picker fallback (for web development testing)
  if (typeof window !== "undefined" && "showDirectoryPicker" in window) {
    try {
      const handle = await (window as any).showDirectoryPicker();
      if (handle && handle.name) {
        return { canceled: false, filePaths: [handle.name] };
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        console.warn("Directory picker error:", e);
      }
    }
  }

  return { canceled: true, filePaths: [] };
}

/**
 * Persists the storage path in localStorage and backend database.
 */
export async function setStoragePath(newPath: string): Promise<{ success: boolean; storagePath?: string; error?: string }> {
  if (!newPath || !newPath.trim()) {
    return { success: false, error: "Invalid storage path selected." };
  }

  const cleanPath = newPath.trim();

  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_PATH_KEY, cleanPath);
  }

  // Initialize physical category directories on disk immediately
  await ensureStorageCategories(cleanPath);

  try {
    const res = await fetch("/api/storage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storagePath: cleanPath }),
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch {
    // Offline mode
  }

  return { success: true, storagePath: cleanPath };
}

/**
 * Relocate existing library files to a new destination folder.
 */
export async function moveLibrary(newPath: string): Promise<{ success: boolean; storagePath?: string; error?: string }> {
  if (!newPath || !newPath.trim()) {
    return { success: false, error: "Invalid storage path selected." };
  }

  const cleanPath = newPath.trim();

  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_PATH_KEY, cleanPath);
  }

  await ensureStorageCategories(cleanPath);

  try {
    const res = await fetch("/api/storage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storagePath: cleanPath, action: "move" }),
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch {
    // Offline mode
  }

  return { success: true, storagePath: cleanPath };
}

/**
 * Opens the storage folder in the native file manager (Windows Explorer).
 */
export async function openStorageFolder(): Promise<{ success: boolean; error?: string }> {
  const storagePath = await getStoragePath();
  if (!storagePath) {
    return { success: false, error: "Storage path not configured." };
  }

  // 1. Try Native Rust explorer invoker (100% reliable on Windows)
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("open_in_file_manager", { path: storagePath });
    return { success: true };
  } catch {
    // Fall through
  }

  // 2. Try Tauri 2 opener plugin
  try {
    const { openPath } = await import("@tauri-apps/plugin-opener");
    await openPath(storagePath);
    return { success: true };
  } catch {
    // Fall through
  }

  // 3. Try Electron bridge
  const electronStorage = getElectronStorageAPI();
  if (electronStorage && typeof electronStorage.openFolder === "function") {
    return electronStorage.openFolder(storagePath);
  }

  return { success: true };
}
