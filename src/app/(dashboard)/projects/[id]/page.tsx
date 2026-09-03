import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  fetchProjects,
  ProjectItem,
} from "@/services/projects/projectService";
import { fetchPrompts, PromptItem } from "@/services/prompts/promptService";
import {
  Briefcase,
  ArrowLeft,
  Download,
  Calendar,
  FileText,
} from "lucide-react";
import jsPDF from "jspdf";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<ProjectItem | null>(null);
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const allProjects = await fetchProjects();
      const p = allProjects.find((x) => x.id === id);
      if (p) {
        setProject(p);
      }
      
      const allPrompts = await fetchPrompts();
      const projectPrompts = allPrompts.filter(p => p.project_id === id && !p.is_archived);
      setPrompts(projectPrompts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExportPDF = async () => {
    if (!project) return;
    try {
      const doc = new jsPDF();
      
      // Title Page
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text(project.name, 20, 30);
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      const descLines = doc.splitTextToSize(project.description || "No description", 170);
      doc.text(descLines, 20, 45);
      
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text(`Status: ${project.status || "Active"}`, 20, 60 + (descLines.length * 5));
      doc.text(`Created: ${new Date(project.created_at).toLocaleDateString()}`, 20, 65 + (descLines.length * 5));
      doc.text(`AI Prompt Library by Bazi Studio`, 20, 75 + (descLines.length * 5));
      
      let y = 100 + (descLines.length * 5);
      
      // Prompts
      doc.addPage();
      y = 20;
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("PROMPTS", 20, y);
      y += 15;
      
      for (const prompt of prompts) {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(prompt.title, 20, y);
        y += 8;
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const contentLines = doc.splitTextToSize(prompt.current_content || "", 170);
        
        for (let i = 0; i < contentLines.length; i++) {
          if (y > 280) {
            doc.addPage();
            y = 20;
          }
          doc.text(contentLines[i], 20, y);
          y += 5;
        }
        
        y += 10;
      }
      
      const safeFilename = `Project_${project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
      const pdfArrayBuffer = doc.output('arraybuffer');
      
      try {
        const filePath = await save({
          defaultPath: safeFilename,
          filters: [{ name: 'PDF', extensions: ['pdf'] }]
        });
        
        if (filePath) {
          await writeFile(filePath, new Uint8Array(pdfArrayBuffer));
          alert("Project successfully exported as PDF!");
        }
      } catch (err) {
        // Fallback for web mode
        doc.save(safeFilename);
      }
      
    } catch (e) {
      console.error(e);
      alert("Failed to generate PDF");
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading project...</div>;
  }

  if (!project) {
    return (
      <div className="p-8 text-center flex flex-col items-center">
        <h2 className="text-xl font-bold mb-2">Project not found</h2>
        <Link to="/projects" className="text-primary hover:underline">Go back to Projects</Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      {/* Header */}
      <div className="flex-none p-6 border-b border-border/40 bg-card/50">
        <Link to="/projects" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Projects
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div 
              className="w-14 h-14 rounded-xl flex items-center justify-center shadow-sm shrink-0"
              style={{ backgroundColor: `${project.color}15`, color: project.color }}
            >
              <Briefcase className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-muted text-xs font-medium border border-border/50">
                  {project.status || "Active"}
                </span>
              </div>
              <p className="text-muted-foreground mt-2 max-w-2xl">
                {project.description || "No description provided."}
              </p>
              <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground font-medium">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Created {new Date(project.created_at).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  {prompts.length} Prompts
                </span>
              </div>
            </div>
          </div>
          
          <button
            onClick={handleExportPDF}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors font-medium text-sm shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export to PDF
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-muted/10">
        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
          Project Content
        </h3>
        
        {prompts.length === 0 ? (
          <div className="bg-card border border-border/50 rounded-xl p-12 text-center max-w-lg mx-auto">
            <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h4 className="text-lg font-medium mb-2">No prompts in this project</h4>
            <p className="text-sm text-muted-foreground mb-6">
              Prompts associated with this project will appear here. Edit a prompt and select this project to add it.
            </p>
            <Link 
              to="/prompts/new" 
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              Create New Prompt
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {prompts.map((prompt) => (
              <Link
                key={prompt.id}
                to={`/prompts/${prompt.id}`}
                className="group bg-card border border-border/50 rounded-xl p-4 hover:border-primary/30 hover:shadow-sm transition-all flex flex-col"
              >
                <h4 className="font-medium text-base mb-2 group-hover:text-primary transition-colors line-clamp-1">
                  {prompt.title}
                </h4>
                <p className="text-xs text-muted-foreground line-clamp-3 mb-4 flex-1 font-mono bg-muted/30 p-2 rounded-md">
                  {prompt.current_content}
                </p>
                <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                  Updated {new Date(prompt.updated_at).toLocaleDateString()}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
