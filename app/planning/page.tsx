"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  Download,
  Upload,
  PlusCircle,
  Film,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Clock,
  ArrowUpDown,
  X,
  Sparkles,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatSecondsToTime } from "@/lib/duration/duration";

export default function PlanningPage() {
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedPlaylist, setSelectedPlaylist] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  // Modals state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [extendModalOpen, setExtendModalOpen] = useState(false);
  
  // CSV Import flow state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [diffReport, setDiffReport] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);

  // Extend planning form state
  const [extendCount, setExtendCount] = useState(5);
  const [extendPlaylist, setExtendPlaylist] = useState("Intermediate Mastery (B1-B2)");
  const [extending, setExtending] = useState(false);

  const fetchEpisodes = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/episodes", {
        headers: { "x-internal-request": "true" },
      });
      const data = await res.json();
      if (data.success) {
        setEpisodes(data.data.episodes);
      }
    } catch (err) {
      console.error("Error loading planning:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEpisodes();
  }, []);

  // Filtered episodes
  const filteredEpisodes = useMemo(() => {
    return episodes.filter((item) => {
      const matchSearch =
        !search ||
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.codeSerie.toLowerCase().includes(search.toLowerCase()) ||
        item.globalId.toString().includes(search) ||
        (item.keywords && item.keywords.toLowerCase().includes(search.toLowerCase()));

      const matchPlaylist =
        selectedPlaylist === "ALL" || item.conceptPlaylist === selectedPlaylist;

      const matchStatus =
        selectedStatus === "ALL" ||
        item.production.publicationStatus === selectedStatus ||
        item.production.planningStatus === selectedStatus ||
        item.production.scriptStatus === selectedStatus;

      return matchSearch && matchPlaylist && matchStatus;
    });
  }, [episodes, search, selectedPlaylist, selectedStatus]);

  // Handle CSV file preview
  const handlePreviewCsv = async (file: File) => {
    setImporting(true);
    setDiffReport(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("action", "preview");

      const res = await fetch("/api/v1/csv/import", {
        method: "POST",
        headers: { "x-internal-request": "true" },
        body: formData,
      });

      const json = await res.json();
      if (json.success) {
        setDiffReport(json.data.diff);
      } else {
        alert(json.error?.message || "Erreur de validation CSV");
      }
    } catch (err: any) {
      alert("Erreur: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  // Confirm CSV Import
  const handleConfirmImport = async () => {
    if (!csvFile) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", csvFile);
      formData.append("action", "confirm");

      const res = await fetch("/api/v1/csv/import", {
        method: "POST",
        headers: { "x-internal-request": "true" },
        body: formData,
      });

      const json = await res.json();
      if (json.success) {
        setImportSuccessMessage(json.data.message);
        fetchEpisodes();
        setTimeout(() => {
          setImportModalOpen(false);
          setDiffReport(null);
          setCsvFile(null);
          setImportSuccessMessage(null);
        }, 2000);
      } else {
        alert(json.error?.message || "Erreur lors de l'application de l'import");
      }
    } catch (err: any) {
      alert("Erreur: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  // Extend planning
  const handleExtendPlanning = async () => {
    setExtending(true);
    try {
      const newItems = [];
      const currentCount = episodes.length;
      for (let i = 1; i <= extendCount; i++) {
        const num = currentCount + i;
        newItems.push({
          codeSerie: `EXT_${num.toString().padStart(2, "0")}`,
          title: `${extendPlaylist} - Module Spécial #${num}: Fluency & Context Drill`,
          conceptPlaylist: extendPlaylist,
          thumbnailText: `MASTER FLUENCY #${num}`,
          thumbnailVisual: `Clean studio visual with typography focus on ${extendPlaylist} topic #${num}`,
          hook: `Discover how to speak naturally without overthinking during real-world conversations.`,
          keywords: `speak english with flow, english fluency, ${extendPlaylist.toLowerCase()}, b2 english, conversation practice`,
          description: `Episode ${num} of Speak English With Flow focusing on advanced natural conversation drills and practical listening.`,
        });
      }

      const res = await fetch("/api/v1/planning/extend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-request": "true",
        },
        body: JSON.stringify({ episodes: newItems }),
      });

      const json = await res.json();
      if (json.success) {
        fetchEpisodes();
        setExtendModalOpen(false);
      } else {
        alert(json.error?.message || "Erreur lors de l'extension");
      }
    } catch (err: any) {
      alert("Erreur: " + err.message);
    } finally {
      setExtending(false);
    }
  };

  const playlists = [
    "ALL",
    "Intermediate Mastery (B1-B2)",
    "Mindset & Psychology",
    "Career & Business English",
    "Life & Social English",
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Main Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            Planning Éditorial
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 font-semibold border border-purple-500/20">
              {filteredEpisodes.length} / {episodes.length} épisodes
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Source de vérité synchronisée avec Neon PostgreSQL • Import/Export déterministe
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-purple-400" />
            Importer CSV
          </button>

          <a
            href="/api/v1/csv/export"
            download
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            Exporter CSV
          </a>

          <button
            onClick={() => setExtendModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white shadow-md shadow-purple-600/20 transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Étendre le planning
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filtrer par titre, code série, mot-clé..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Statut:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-purple-500"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="NOT_STARTED">Non démarré</option>
              <option value="IN_PROGRESS">En cours</option>
              <option value="WAITING_USER">Attente utilisateur</option>
              <option value="READY">Prêt</option>
              <option value="APPROVED">Validé</option>
              <option value="COMPLETED">Terminé</option>
            </select>
          </div>
        </div>

        {/* Playlists Pills */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-800/60">
          <span className="text-[11px] text-slate-500 mr-1">Playlists:</span>
          {playlists.map((pl) => (
            <button
              key={pl}
              onClick={() => setSelectedPlaylist(pl)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                selectedPlaylist === pl
                  ? "bg-purple-600/20 text-purple-300 border border-purple-500/40"
                  : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200"
              }`}
            >
              {pl === "ALL" ? "Toutes les playlists" : pl}
            </button>
          ))}
        </div>
      </div>

      {/* Episodes Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4 w-16"># ID</th>
                <th className="py-3 px-4 w-28">Code Série</th>
                <th className="py-3 px-4">Titre de la Vidéo</th>
                <th className="py-3 px-4 w-48">Concept / Playlist</th>
                <th className="py-3 px-4 w-28">Statut</th>
                <th className="py-3 px-4 w-20">Durée</th>
                <th className="py-3 px-4 w-24 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredEpisodes.length > 0 ? (
                filteredEpisodes.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    <td className="py-3 px-4 font-mono font-semibold text-slate-400">
                      {item.globalId}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-purple-300">
                      {item.codeSerie}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white group-hover:text-purple-300 transition-colors">
                        {item.title}
                      </div>
                      {item.hook && (
                        <div className="text-[11px] text-slate-500 truncate max-w-md mt-0.5">
                          {item.hook}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[11px]">
                        {item.conceptPlaylist}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge
                        status={
                          item.production.publicationStatus === "COMPLETED"
                            ? "COMPLETED"
                            : item.production.scriptStatus || item.production.planningStatus
                        }
                        size="sm"
                      />
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {item.formattedDuration || "00:00"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/episodes/${item.codeSerie}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-600/10 hover:bg-purple-600 text-purple-400 hover:text-white border border-purple-500/20 font-medium text-[11px] transition-all"
                      >
                        <Film className="w-3 h-3" />
                        Ouvrir
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                    {loading ? "Chargement des épisodes..." : "Aucun épisode ne correspond aux filtres."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CSV IMPORT MODAL */}
      {importModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-purple-400" />
                Import de Planning CSV & Générateur de Diff
              </h3>
              <button
                onClick={() => {
                  setImportModalOpen(false);
                  setDiffReport(null);
                  setCsvFile(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {importSuccessMessage ? (
              <div className="p-6 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <h4 className="font-bold text-white text-sm">{importSuccessMessage}</h4>
              </div>
            ) : !diffReport ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Le système compare le fichier CSV avec la base Neon PostgreSQL, génère un diff sans écraser de données silencieusement, et attend votre confirmation.
                </p>

                <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center space-y-3 bg-slate-950/60">
                  <Upload className="w-8 h-8 text-slate-500 mx-auto" />
                  <div className="text-xs text-slate-300 font-medium">
                    Sélectionnez votre fichier CSV (format éditorial 9 colonnes)
                  </div>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setCsvFile(file);
                        handlePreviewCsv(file);
                      }
                    }}
                    className="block mx-auto text-xs text-slate-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-500 cursor-pointer"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Diff Summary */}
                <div className="grid grid-cols-4 gap-3 text-center text-xs">
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                    <div className="font-bold text-lg">{diffReport.summary.toCreate}</div>
                    <div className="text-[10px]">Nouveaux à créer</div>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
                    <div className="font-bold text-lg">{diffReport.summary.toUpdate}</div>
                    <div className="text-[10px]">Modifications détectées</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
                    <div className="font-bold text-lg">{diffReport.summary.unchanged}</div>
                    <div className="text-[10px]">Identiques (sans changement)</div>
                  </div>
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400">
                    <div className="font-bold text-lg">{diffReport.summary.missingInCsv}</div>
                    <div className="text-[10px]">Présents en DB (non supprimés)</div>
                  </div>
                </div>

                {/* Diff Items list */}
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {diffReport.items.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-lg border text-xs flex items-start justify-between ${
                        item.type === "CREATE"
                          ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
                          : item.type === "UPDATE"
                          ? "bg-amber-950/20 border-amber-500/30 text-amber-300"
                          : "bg-slate-950 border-slate-800 text-slate-400"
                      }`}
                    >
                      <div>
                        <span className="font-bold font-mono mr-2">{item.codeSerie}</span>
                        <span className="font-medium text-slate-200">{item.title}</span>
                        {item.diffs && item.diffs.length > 0 && (
                          <div className="mt-1 text-[11px] text-amber-400 space-y-0.5">
                            {item.diffs.map((d: any, dIdx: number) => (
                              <div key={dIdx}>
                                • <strong>{d.field}</strong>: &quot;{d.oldValue}&quot; ➔ &quot;{d.newValue}&quot;
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-900">
                        {item.type}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    onClick={() => setDiffReport(null)}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                  >
                    Annuler / Recommencer
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    disabled={importing || !diffReport.canProceed}
                    className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white shadow-lg shadow-purple-600/30 disabled:opacity-50"
                  >
                    {importing ? "Application en cours..." : "Confirmer et Appliquer le Diff"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EXTEND PLANNING MODAL */}
      {extendModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Étendre le Planning Éditorial
              </h3>
              <button onClick={() => setExtendModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Nombre d&apos;épisodes à ajouter</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={extendCount}
                  onChange={(e) => setExtendCount(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Playlist cible</label>
                <select
                  value={extendPlaylist}
                  onChange={(e) => setExtendPlaylist(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="Intermediate Mastery (B1-B2)">Intermediate Mastery (B1-B2)</option>
                  <option value="Mindset & Psychology">Mindset & Psychology</option>
                  <option value="Career & Business English">Career & Business English</option>
                  <option value="Life & Social English">Life & Social English</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setExtendModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
              >
                Annuler
              </button>
              <button
                onClick={handleExtendPlanning}
                disabled={extending}
                className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white disabled:opacity-50"
              >
                {extending ? "Ajout..." : `Ajouter ${extendCount} épisodes`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
