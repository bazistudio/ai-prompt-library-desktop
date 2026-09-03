import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  fetchProjects,
  createProject,
  deleteProject,
  ProjectItem,
} from "@/services/projects/projectService";
import {
  Briefcase,
  Plus,
  Trash2,
  ArrowRight,
  Search,
  FolderTree,
} from "lucide-react";

export default function ProjectsLibraryPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [newProjectStatus, setNewProjectStatus] = useState("Active");
  const [creating, setCreating] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const items = await fetchProjects();
      setProjects(items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setCreating(true);
    try {
      await createProject({
        name: newProjectName.trim(),
        description: newProjectDesc.trim() || undefined,
        status: newProjectStatus,
      });
      setNewProjectName("");
      setNewProjectDesc("");
      setCreateModalOpen(false);
      await loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this project? Your prompts will be moved to the General Workspace and will NOT be deleted.")) {
      try {
        await deleteProject(id);
        await loadData();
      } catch (e) {
        console.error(e);
        alert("Failed to delete project");
      }
    }
  };

  const filtered = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description?.toLowerCase() || "").includes(search.toLowerCase());
    
    if (filter === "active") return matchesSearch && p.status === "Active";
    if (filter === "archived") return matchesSearch && p.status === "Archived";
    return matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      {/* Header */}
      <div className="flex-none p-6 border-b border-border/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Organize your prompts and AI work around specific goals or contexts.
            </p>
          </div>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>

        {/* Filters and Search */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex bg-muted/50 p-1 rounded-lg border border-border/50">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                filter === "all" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("active")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                filter === "active" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilter("archived")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                filter === "archived" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Archived
            </button>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading projects...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <FolderTree className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No projects found</h3>
            <p className="text-muted-foreground mb-8">
              {search
                ? "We couldn't find any projects matching your search."
                : "Create your first project to organize prompts and AI work around a specific goal."}
            </p>
            {!search && (
              <button
                onClick={() => setCreateModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all font-medium shadow-md shadow-primary/20"
              >
                <Plus className="w-4 h-4" />
                Create Project
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((proj) => (
              <div
                key={proj.id}
                className="group relative bg-card border border-border/50 rounded-xl p-5 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 transition-all flex flex-col"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center shadow-xs"
                      style={{ backgroundColor: `${proj.color}15`, color: proj.color }}
                    >
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base leading-tight group-hover:text-primary transition-colors">
                        {proj.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {proj.status || "Active"}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2 mb-6 flex-1">
                  {proj.description || "No description provided."}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-border/40">
                  <div className="text-xs font-medium text-muted-foreground">
                    {proj.prompt_count || 0} prompt{(proj.prompt_count || 0) !== 1 ? 's' : ''}
                  </div>
                  <div className="flex items-center gap-2">
                    {!proj.is_default && (
                      <button
                        onClick={() => handleDelete(proj.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                        title="Delete Project"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <Link
                      to={`/projects/${proj.id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-md transition-colors"
                    >
                      Open <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border shadow-2xl rounded-2xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-bold">Create Project</h2>
              <p className="text-sm text-muted-foreground mt-1">
                A universal workspace for organizing AI-assisted work.
              </p>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Project Name</label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. Q3 Marketing Campaign"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1.5">Description (Optional)</label>
                <textarea
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="Briefly describe what this project is for..."
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 h-24 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Status</label>
                <select
                  value={newProjectStatus}
                  onChange={(e) => setNewProjectStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="Active">Active</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Completed">Completed</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newProjectName.trim() || creating}
                  className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
