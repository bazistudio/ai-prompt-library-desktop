"use client";

import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";
import {
  AnalyticsSummary,
} from "@/database/local/analyticsQueries";
import {
  BarChart3,
  TrendingUp,
} from "lucide-react";

interface AnalyticsDashboardProps {
  initialData?: AnalyticsSummary;
}

export function AnalyticsDashboard({ initialData }: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsSummary | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);

  const fetchMetrics = async () => {
    try {
      const res = await fetch("/api/analytics");
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const json = await res.json();
          setData(json);
        }
      }
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialData) {
      fetchMetrics();
    }
  }, [initialData]);

  if (loading || !data) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Library Analytics & Productivity Insights
        </h2>
      </div>

      {/* 14-Day Activity Heat / Trend */}
      <div className="p-5 rounded-2xl border border-border/80 bg-card/60 dark:bg-card/40 backdrop-blur-md shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">14-Day Activity & Version Velocity</h3>
              <p className="text-xs text-muted-foreground">
                Track newly created prompts and iterative version revisions over the last 2 weeks.
              </p>
            </div>
          </div>
        </div>

        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.activityTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorVersions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "currentColor", opacity: 0.7 }} />
              <YAxis tick={{ fontSize: 10, fill: "currentColor", opacity: 0.7 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.9)",
                  borderRadius: "12px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  fontSize: "12px",
                  color: "#fff",
                }}
              />
              <Area
                type="monotone"
                dataKey="promptsCreated"
                name="Prompts Created"
                stroke="#6366f1"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorCreated)"
              />
              <Area
                type="monotone"
                dataKey="versionsAdded"
                name="Versions Logged"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorVersions)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Version Depth & Audit Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-border/80 bg-background/50 flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground">Single-Version Prompts</span>
            <p className="text-lg font-bold text-foreground font-mono">
              {data.versionDistribution.singleVersion}
            </p>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
            Initial drafts
          </span>
        </div>

        <div className="p-4 rounded-xl border border-border/80 bg-background/50 flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground">Iterated Prompts (2-3 vers.)</span>
            <p className="text-lg font-bold text-foreground font-mono">
              {data.versionDistribution.moderateVersions}
            </p>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-md bg-primary/10 text-primary">
            Iterative
          </span>
        </div>

        <div className="p-4 rounded-xl border border-border/80 bg-background/50 flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground">Deeply Refined (4+ vers.)</span>
            <p className="text-lg font-bold text-foreground font-mono">
              {data.versionDistribution.deepVersions}
            </p>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500">
            Production grade
          </span>
        </div>
      </div>

      {/* Most Used Prompts */}
      <div className="p-5 rounded-2xl border border-border/80 bg-card/60 dark:bg-card/40 backdrop-blur-md shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border/50 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Most Used Prompts</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Top performing prompts based on execution frequency.</p>
            </div>
          </div>
        </div>
        
        {data.mostUsedPrompts && data.mostUsedPrompts.length > 0 ? (
          <div className="space-y-2">
            {data.mostUsedPrompts.map((p, idx) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-background/50 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-6 text-center font-mono text-sm font-bold text-muted-foreground">
                    {idx + 1}.
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{p.title}</p>
                    {p.last_used_at && (
                      <p className="text-[11px] text-muted-foreground">
                        Last used: {new Date(p.last_used_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-foreground">{p.usage_count}</span>
                  <span className="text-[11px] text-muted-foreground ml-1">uses</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
            <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground">
              <BarChart3 className="h-5 w-5 opacity-50" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">No prompt usage recorded yet.</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Execute or copy prompts to start tracking usage.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
