"use client";

import React, { useState } from "react";
import {
  Terminal,
  ShieldCheck,
  ExternalLink,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Globe,
  Users,
  MessageCircle,
  Mail,
  Copy,
  Check,
  X,
  ChevronRight,
  HelpCircle,
} from "lucide-react";
import { useAutoUpdater } from "@/hooks/useAutoUpdater";

export function AboutSettings() {
  const updater = useAutoUpdater();
  const [showBaziModal, setShowBaziModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

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

  const openExternalUrl = async (url: string) => {
    try {
      const { openUrl } = await import("@tauri-apps/plugin-opener");
      await openUrl(url);
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

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

      {/* 4. Resources & Support Section */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
          Resources & Support
        </h2>
        <div className="flex flex-col divide-y divide-border border border-border rounded-2xl overflow-hidden bg-card shadow-sm">
          {/* About Bazi Studio & Team */}
          <button
            type="button"
            onClick={() => setShowBaziModal(true)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-secondary/30 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary text-foreground group-hover:text-primary transition-colors">
                <Users className="h-4.5 w-4.5" />
              </div>
              <div>
                <span className="text-sm font-semibold text-foreground block group-hover:text-primary transition-colors">
                  About Bazi Studio & Team
                </span>
                <span className="text-xs text-muted-foreground">
                  Company information, engineering vision, and official website
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors">
              <span>Details</span>
              <ChevronRight className="h-4 w-4" />
            </div>
          </button>

          {/* Report an Issue / Feedback */}
          <button
            type="button"
            onClick={() => setShowSupportModal(true)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-secondary/30 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary text-foreground group-hover:text-primary transition-colors">
                <HelpCircle className="h-4.5 w-4.5" />
              </div>
              <div>
                <span className="text-sm font-semibold text-foreground block group-hover:text-primary transition-colors">
                  Report an Issue / Feedback
                </span>
                <span className="text-xs text-muted-foreground">
                  Direct support via WhatsApp (03325220620) or Email (bazistudio51@gmail.com)
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors">
              <span>Contact</span>
              <ChevronRight className="h-4 w-4" />
            </div>
          </button>

          {/* Official Verification Badge */}
          <div className="flex items-center justify-between p-4 text-sm text-muted-foreground bg-secondary/10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                <ShieldCheck className="h-4.5 w-4.5" />
              </div>
              <div>
                <span className="font-semibold text-foreground text-xs block">
                  Official Bazi Studio Software Release
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Code-signed and cryptographically verified release channel
                </span>
              </div>
            </div>
            <span className="text-xs font-mono text-emerald-500 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
              Verified
            </span>
          </div>
        </div>
      </div>

      {/* 5. Integrity & Security Footer */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-4 border-t border-border">
        <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
        <span>Bazi Studio Private Workspace. Offline encryption and local database integrity active.</span>
      </div>

      {/* MODAL 1: About Bazi Studio & Team */}
      {showBaziModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border bg-secondary/20">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-md">
                  <Terminal className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">About Bazi Studio</h3>
                  <p className="text-xs text-muted-foreground">Software Engineering & AI Workspace Solutions</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBaziModal(false)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-left">
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">About Bazi Studio</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Bazi Studio specializes in building high-performance, offline-first desktop applications and intelligent workflow systems. Our flagship application, AI Prompt Library, empowers developers, creators, and teams to securely store, version, test, and run AI prompts entirely on their local machines.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-border">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Engineering Team</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Our core engineering team brings together expertise in Rust, Tauri native systems, React/Vite modern web stacks, and local SQLite data architecture to deliver privacy-centric and state-of-the-art developer software.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-border">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Deep Dive</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Discover more tools, open-source projects, and upcoming platform releases by visiting the official Bazi Studio portal.
                </p>
                <button
                  type="button"
                  onClick={() => openExternalUrl("https://bazistudio.com")}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-md transition-all cursor-pointer"
                >
                  <Globe className="h-4 w-4" />
                  <span>Visit Bazi Studio Website</span>
                  <ExternalLink className="h-3.5 w-3.5 ml-0.5" />
                </button>
              </div>
            </div>

            <div className="p-4 border-t border-border bg-secondary/10 flex justify-end">
              <button
                type="button"
                onClick={() => setShowBaziModal(false)}
                className="px-4 py-1.5 rounded-xl border border-border bg-card text-foreground hover:bg-muted text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Direct Support & Feedback */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border bg-secondary/20">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Report an Issue / Feedback</h3>
                  <p className="text-xs text-muted-foreground">Direct contact channels with Bazi Studio support</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSupportModal(false)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-left">
              {/* WhatsApp Support Option */}
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <MessageCircle className="h-5 w-5 text-emerald-500" />
                    <div>
                      <h4 className="text-xs font-bold text-foreground">WhatsApp Direct Support</h4>
                      <p className="text-[11px] text-muted-foreground">Instant chat, bug reports, and quick assistance</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                    Fastest
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
                  <div className="font-mono text-sm font-bold text-foreground bg-card px-3 py-1.5 rounded-lg border border-border">
                    03325220620
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy("03325220620", "whatsapp")}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-card hover:bg-muted text-foreground flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedField === "whatsapp" ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => openExternalUrl("https://wa.me/923325220620")}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <span>Open Chat</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Email Support Option */}
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Mail className="h-5 w-5 text-primary" />
                    <div>
                      <h4 className="text-xs font-bold text-foreground">Email Support & Feedback</h4>
                      <p className="text-[11px] text-muted-foreground">Detailed bug reports, logs, and feature inquiries</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/20 text-primary">
                    Official
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
                  <div className="font-mono text-xs font-bold text-foreground bg-card px-3 py-1.5 rounded-lg border border-border truncate max-w-full">
                    bazistudio51@gmail.com
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy("bazistudio51@gmail.com", "email")}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-card hover:bg-muted text-foreground flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedField === "email" ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => openExternalUrl("mailto:bazistudio51@gmail.com")}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <span>Send Email</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border bg-secondary/10 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSupportModal(false)}
                className="px-4 py-1.5 rounded-xl border border-border bg-card text-foreground hover:bg-muted text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
