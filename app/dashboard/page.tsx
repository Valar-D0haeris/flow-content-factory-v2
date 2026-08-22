"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Clock,
  FileText,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Layers,
  Film,
  PlayCircle,
  RefreshCw,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatSecondsToHuman, formatSecondsToTime } from "@/lib/duration/duration";

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [nextEpisode, setNextEpisode] = useState<any>(null);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, nextRes] = await Promise.all([
        fetch("/api/v1/production", { headers: { "x-internal-request": "true" } }),
        fetch("/api/v1/production/next", { headers: { "x-internal-request": "true" } }),
      ]);

      const prodData = await prodRes.json();
      const nextData = await nextRes.json();

      if (prodData.success) {
        setStats(prodData.data.stats);
        setRecentEvents(prodData.data.recentEvents || []);
      }
      if (nextData.success) {
        setNextEpisode(nextData.data.nextEpisode);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            Centre de Production
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 font-semibold border border-purple-500/20">
              Speak English With Flow
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Persistance active Neon PostgreSQL • Suivi éditorial et agentique en temps réel
          </p>
        </div>

        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-300 border border-slate-800 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Actualiser
        </button>
      </div>

      {/* Hero: Next Episode to Produce Card */}
      {nextEpisode ? (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-slate-900/60 border border-purple-500/30 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-bold text-xs border border-purple-500/30 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  PROCHAIN ÉPISODE RECOMMANDÉ
                </span>
                <span className="font-mono text-xs font-semibold text-slate-400">
                  {nextEpisode.codeSerie} • EP #{nextEpisode.globalId}
                </span>
                <StatusBadge status={nextEpisode.production?.scriptStatus || "NOT_STARTED"} size="sm" />
              </div>

              <h2 className="text-xl font-bold text-white leading-snug">
                {nextEpisode.title}
              </h2>

              <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                {nextEpisode.hook || nextEpisode.description || "Aucun brief renseigné."}
              </p>

              <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                <span>Playlist: <strong className="text-slate-200">{nextEpisode.conceptPlaylist}</strong></span>
                {nextEpisode.formattedDuration && nextEpisode.formattedDuration !== "00:00" && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Durée: <strong className="text-slate-200">{nextEpisode.formattedDuration}</strong>
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={`/episodes/${nextEpisode.codeSerie}`}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 font-semibold text-xs text-white shadow-lg shadow-purple-600/30 transition-all hover:scale-[1.02]"
              >
                <Film className="w-4 h-4" />
                Ouvrir le Studio de Production
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
          <h3 className="text-sm font-semibold text-white">Tous les épisodes sont finalisés !</h3>
          <p className="text-xs text-slate-400">Le planning actuel de 45 épisodes est entièrement complété.</p>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="text-[11px] font-medium text-slate-400">Total Épisodes</div>
          <div className="text-2xl font-black text-white">{stats?.totalEpisodes || 45}</div>
          <div className="text-[10px] text-slate-500">Planning éditorial</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="text-[11px] font-medium text-amber-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> En cours
          </div>
          <div className="text-2xl font-black text-white">{stats?.inProgress || 0}</div>
          <div className="text-[10px] text-slate-500">Scripts & audio actifs</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="text-[11px] font-medium text-cyan-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> Validés / Prêts
          </div>
          <div className="text-2xl font-black text-white">{(stats?.approved || 0) + (stats?.ready || 0)}</div>
          <div className="text-[10px] text-slate-500">En attente publication</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Terminés
          </div>
          <div className="text-2xl font-black text-white">{stats?.completed || 0}</div>
          <div className="text-[10px] text-slate-500">{stats?.completionRate || 0}% complété</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="text-[11px] font-medium text-purple-400 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Durée Totale
          </div>
          <div className="text-lg font-black text-white">
            {formatSecondsToHuman(stats?.totalDurationSeconds)}
          </div>
          <div className="text-[10px] text-slate-500">Contenu produit</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="text-[11px] font-medium text-slate-400">Non Démarrés</div>
          <div className="text-2xl font-black text-slate-300">{stats?.notStarted || 0}</div>
          <div className="text-[10px] text-slate-500">Dans le pipeline</div>
        </div>
      </div>

      {/* Dual Section: Recent Activity & Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Production Timeline */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-slate-900/50 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              Journal d&apos;Activité Récent (Audit Persistant)
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">Derniers 10 événements</span>
          </div>

          <div className="space-y-3">
            {recentEvents.length > 0 ? (
              recentEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800/60 text-xs"
                >
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      evt.actorType === "GPT"
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                        : evt.actorType === "SYSTEM"
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    }`}
                  >
                    {evt.actorType}
                  </span>
                  <div className="flex-1 space-y-0.5">
                    <div className="text-slate-200 font-medium">{evt.description}</div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {new Date(evt.createdAt).toLocaleString("fr-FR")} • {evt.eventType}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-500 text-center py-6">Aucune activité enregistrée pour le moment.</div>
            )}
          </div>
        </div>

        {/* Series Distribution Breakdown */}
        <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-800 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Répartition des Séries
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Distribution du catalogue Speak English With Flow</p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1">
              <div className="flex justify-between text-slate-300 font-semibold">
                <span>Intermediate Mastery (B1-B2)</span>
                <span className="text-purple-400">15 épisodes</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-full w-[33%]" />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1">
              <div className="flex justify-between text-slate-300 font-semibold">
                <span>Mindset & Psychology</span>
                <span className="text-cyan-400">10 épisodes</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-cyan-500 h-full w-[22%]" />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1">
              <div className="flex justify-between text-slate-300 font-semibold">
                <span>Career & Business English</span>
                <span className="text-amber-400">10 épisodes</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full w-[22%]" />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1">
              <div className="flex justify-between text-slate-300 font-semibold">
                <span>Life & Social English</span>
                <span className="text-emerald-400">10 épisodes</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full w-[22%]" />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Link
              href="/planning"
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
            >
              Voir la table de planning complète
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
