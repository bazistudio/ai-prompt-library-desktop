const STORAGE_PATH_KEY = "ai_prompt_library_storage_path";
const DEFAULT_STORAGE_PATH = "PromptLibrary";

function getElectronStorageAPI() {
  if (typeof window === "undefined") return null;
  return (window as any).electronAPI?.storage || (window as any).electron?.storage || null;
}

export async function getStoragePath(): Promise<string | null> {
  const electronStorage = getElectronStorageAPI();
  if (electronStorage && typeof electronStorage.getPath === "function") {
    return electronStorage.getPath();
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
    return saved || DEFAULT_STORAGE_PATH;
  }

  return DEFAULT_STORAGE_PATH;
}

export async function selectStorageFolder(): Promise<{ canceled: boolean; filePaths: string[] }> {
  const electronStorage = getElectronStorageAPI();
  if (electronStorage && typeof electronStorage.selectFolder === "function") {
    return electronStorage.selectFolder();
  }
  return { canceled: true, filePaths: [] };
}

export async function setStoragePath(newPath: string): Promise<{ success: boolean; storagePath?: string; error?: string }> {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_PATH_KEY, newPath);
  }

  try {
    const res = await fetch("/api/storage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storagePath: newPath }),
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch {
    // Offline mode
  }

  return { success: true, storagePath: newPath };
}

export async function moveLibrary(newPath: string): Promise<{ success: boolean; storagePath?: string; error?: string }> {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_PATH_KEY, newPath);
  }

  try {
    const res = await fetch("/api/storage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storagePath: newPath, action: "move" }),
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch {
    // Offline mode
  }

  return { success: true, storagePath: newPath };
}

export async function openStorageFolder(): Promise<{ success: boolean; error?: string }> {
  const storagePath = await getStoragePath();
  const electronStorage = getElectronStorageAPI();
  if (electronStorage && typeof electronStorage.openFolder === "function" && storagePath) {
    return electronStorage.openFolder(storagePath);
  }
  return { success: false, error: storagePath ? "Folder opened locally in workspace." : "Storage path not configured." };
}
