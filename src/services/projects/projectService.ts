export interface ProjectItem {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  sort_order: number;
  is_default: boolean;
  prompt_count?: number;
  created_at: number;
  updated_at: number;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
}

const DEFAULT_PROJECTS: ProjectItem[] = [
  {
    id: "proj_default",
    name: "General Workspace",
    description: "Default prompt engineering workspace",
    color: "#6366f1",
    icon: "folder",
    sort_order: 1,
    is_default: true,
    created_at: 1700000000000,
    updated_at: 1700000000000,
  },
];

const STORAGE_KEY = "ai_prompt_library_workspaces_v1";

function getStoredProjects(): ProjectItem[] {
  if (typeof window === "undefined") return DEFAULT_PROJECTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Error reading projects from storage:", e);
  }
  return DEFAULT_PROJECTS;
}

function saveStoredProjects(projs: ProjectItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projs));
  } catch (e) {
    console.error("Error saving projects to storage:", e);
  }
}

export async function fetchProjects(): Promise<ProjectItem[]> {
  try {
    const res = await fetch("/api/projects");
    if (res.ok) {
      const data = await res.json();
      if (data.projects && Array.isArray(data.projects) && data.projects.length > 0) {
        saveStoredProjects(data.projects);
        return data.projects;
      }
    }
  } catch {
    // In offline or Vite development mode without Next.js API server
  }

  return getStoredProjects();
}

export async function createProject(input: CreateProjectInput): Promise<{ success: boolean; project?: ProjectItem; error?: string }> {
  const trimmed = input.name.trim();
  if (!trimmed) {
    return { success: false, error: "Workspace name cannot be empty." };
  }

  try {
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.project) {
        const current = getStoredProjects();
        const next = [...current.filter(p => p.id !== data.project.id), data.project];
        saveStoredProjects(next);
        return data;
      }
    }
  } catch {
    // Fallback to local storage
  }

  const current = getStoredProjects();
  const newProj: ProjectItem = {
    id: `proj_${Date.now()}`,
    name: trimmed,
    description: input.description || null,
    color: input.color || "#6366f1",
    icon: input.icon || "folder",
    sort_order: current.length + 1,
    is_default: false,
    created_at: Date.now(),
    updated_at: Date.now(),
  };

  const next = [...current, newProj];
  saveStoredProjects(next);
  return { success: true, project: newProj };
}

export async function updateProject(id: string, input: UpdateProjectInput): Promise<{ success: boolean; project?: ProjectItem; error?: string }> {
  try {
    const res = await fetch(`/api/projects?id=${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.project) {
        const current = getStoredProjects();
        const next = current.map(p => p.id === id ? data.project : p);
        saveStoredProjects(next);
        return data;
      }
    }
  } catch {
    // Fallback to local storage
  }

  const current = getStoredProjects();
  let updated: ProjectItem | undefined;
  const next = current.map(p => {
    if (p.id === id) {
      updated = {
        ...p,
        name: input.name !== undefined ? input.name.trim() : p.name,
        description: input.description !== undefined ? (input.description || null) : p.description,
        color: input.color || p.color,
        icon: input.icon || p.icon,
        updated_at: Date.now(),
      };
      return updated;
    }
    return p;
  });

  if (!updated) {
    return { success: false, error: "Workspace not found." };
  }

  saveStoredProjects(next);
  return { success: true, project: updated };
}

export async function deleteProject(id: string): Promise<{ success: boolean; error?: string }> {
  if (id === "proj_default") {
    return { success: false, error: "Cannot delete the default workspace." };
  }

  try {
    const res = await fetch(`/api/projects?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        const current = getStoredProjects();
        const next = current.filter(p => p.id !== id);
        saveStoredProjects(next);
        return data;
      }
    }
  } catch {
    // Fallback to local storage
  }

  const current = getStoredProjects();
  const next = current.filter(p => p.id !== id);
  saveStoredProjects(next);
  return { success: true };
}
