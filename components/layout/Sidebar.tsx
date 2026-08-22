"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Film,
  Settings,
  Sparkles,
  Database,
  ExternalLink,
  BookOpen,
  CheckCircle2,
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Planning Éditorial",
      href: "/planning",
      icon: CalendarDays,
      badge: "45",
    },
    {
      name: "Studio Épisode",
      href: "/episodes/B1-B2_01",
      icon: Film,
    },
    {
      name: "Paramètres & API",
      href: "/settings",
      icon: Settings,
    },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-950/80 flex flex-col justify-between p-4 min-h-screen sticky top-0">
      <div className="space-y-6">
        {/* Brand */}
        <div className="flex items-center gap-3 px-2 py-3 border-b border-slate-800/80">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-purple-500/20 text-white font-black text-lg">
            F
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
              FLOW FACTORY
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30">
                v2.0
              </span>
            </div>
            <div className="text-[11px] text-slate-400">Speak English With Flow</div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard" || pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-purple-600/15 text-purple-300 border border-purple-500/30 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? "text-purple-400" : "text-slate-400"}`} />
                  {item.name}
                </div>
                {item.badge && (
                  <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Active GPT Assistant status */}
        <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-900/40 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-300">
            <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-spin" style={{ animationDuration: "6s" }} />
            Mémoire Persistante GPT
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            API connectée en temps réel. Les agents GPT lisent et écrivent sans dépendance conversationnelle.
          </p>
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            PostgreSQL & Blob Ready
          </div>
        </div>
      </div>

      {/* Bottom Info */}
      <div className="pt-4 border-t border-slate-800 text-xs text-slate-500 space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1.5">
            <Database className="w-3 h-3 text-slate-400" /> Neon PostgreSQL
          </span>
          <span className="text-emerald-400 font-mono text-[10px]">SYNCED</span>
        </div>
        <div className="text-[10px] text-slate-600">
          Source de vérité éditoriale • Speak English With Flow
        </div>
      </div>
    </aside>
  );
}
