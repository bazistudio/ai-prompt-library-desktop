"use client";

import React from "react";
import { Terminal, ShieldCheck, ExternalLink, Code, BookOpen, AlertCircle, RefreshCw, Sparkles, CheckCircle2 } from "lucide-react";
import { useAutoUpdater } from "@/hooks/useAutoUpdater";

export function AboutSettings() {
  const updater = useAutoUpdater();

  const stack = [
    { name: "Tauri", desc: "Native Rust Shell", version: "v2.0" },
    { name: "React", desc: "UI Library", version: "v19.0" },
    { name: "Vite", desc: "Build Tool", version: "v6.4" },
    { name: "Rust", desc: "Native Core & SQLite", version: "v1.85" },
  ];

  const isDownloading = updater.status === "downloading";
  const isDownloaded = updater.status === "downloaded" || updater.isModalOpen;
  const isChecking = updater.status === "checking" || updater.isManualChecking;
  const isInstalling = updater.status === "installing";

  return (
    <div className="space-y-8 max-w-2xl text-left">
      {/* 1. Hero Logo & Version Branding */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 bg-secondary/20 p-6 rounded-2xl border border-border">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary">
            <Terminal className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">AI Prompt Library Desktop</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Private Offline Prompt Workspace · <span className="font-mono font-semibold text-primary">v{updater.currentVersion}</span>
            </p>
          </div>
        </div>

        <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          Official Desktop Build
        </span>
      </div>

      {/* 2. Desktop Auto-Updater Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
            Software Updates
          </h2>
          <span className="text-xs text-muted-foreground">
            Windows NSIS Target
          </span>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-border space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold text-foreground">Automatic Update Engine</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {updater.manualMessage || (isChecking ? "Checking for latest release..." : `Currently installed version is v${updater.currentVersion}.`)}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="https://github.com/bazistudio/ai-prompt-library-desktop/releases/latest"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-background hover:bg-muted text-foreground text-xs font-semibold transition-all cursor-pointer whitespace-nowrap"
                title="Open GitHub Releases page in browser"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>GitHub Releases</span>
              </a>

              <button
                type="button"
                onClick={() => updater.checkForUpdatesManual()}
                disabled={isChecking || isDownloading || isInstalling}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-md shadow-primary/20 transition-all cursor-pointer disabled:opacity-60 whitespace-nowrap"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isChecking || isDownloading || isInstalling ? "animate-spin" : ""}`} />
                <span>
                  {isChecking
                    ? "Checking..."
                    : isDownloading
                    ? `Downloading (${updater.downloadProgress}%)`
                    : isInstalling
                    ? "Installing..."
                    : "Check for Updates"}
                </span>
              </button>
            </div>
          </div>

          {/* Live Download Progress Bar */}
          {isDownloading && (
            <div className="space-y-1.5 pt-2 border-t border-border/50">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-primary font-semibold">Downloading update in background...</span>
                <span className="font-mono text-muted-foreground">{updater.downloadProgress}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${updater.downloadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Update Ready Actions Card */}
          {isDownloaded && updater.availableVersion && (
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-foreground block">
                    Update v{updater.availableVersion} is Ready!
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Downloaded and verified. Install now or on next launch.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={updater.dismissModal}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border bg-background hover:bg-muted text-foreground cursor-pointer"
                >
                  On Next Launch
                </button>
                <button
                  type="button"
                  onClick={() => updater.installNow()}
                  disabled={isInstalling}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm cursor-pointer disabled:opacity-60"
                >
                  {isInstalling ? "Installing..." : "Install Now"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Build Stack */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
          Software Architecture
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {stack.map((item) => (
            <div
              key={item.name}
              className="glass-card p-4 rounded-xl border border-border flex items-center justify-between"
            >
              <div className="flex flex-col">
                <span className="text-sm font-bold text-foreground">{item.name}</span>
                <span className="text-xs text-muted-foreground mt-0.5">{item.desc}</span>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded bg-secondary text-secondary-foreground border border-border">
                {item.version}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Documentation & External Links */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
          Resources & Support
        </h2>
        <div className="flex flex-col gap-1 border border-border rounded-xl overflow-hidden bg-card">
          <a
            href="https://github.com/bazistudio/ai-prompt-library-desktop"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 hover:bg-muted text-sm text-muted-foreground hover:text-foreground border-b border-border transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Code className="h-4.5 w-4.5" />
              <span className="font-semibold">GitHub Repository & Releases</span>
            </div>
            <ExternalLink className="h-4 w-4 opacity-55" />
          </a>

          <a
            href="https://github.com/bazistudio/ai-prompt-library-desktop/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 hover:bg-muted text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="h-4.5 w-4.5" />
              <span className="font-semibold">Report an Issue / Feedback</span>
            </div>
            <ExternalLink className="h-4 w-4 opacity-55" />
          </a>
        </div>
      </div>

      {/* 5. Integrity & Security Footer */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-4 border-t border-border">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <span>Bazi Studio Private Workspace. Offline encryption and local database integrity active.</span>
      </div>
    </div>
  );
}

