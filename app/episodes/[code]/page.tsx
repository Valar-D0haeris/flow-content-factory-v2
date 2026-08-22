"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Film,
  FileText,
  Clock,
  Tag,
  Image as ImageIcon,
  History,
  Sparkles,
  CheckCircle2,
  Save,
  ArrowLeft,
  ArrowRight,
  Play,
  Volume2,
  Copy,
  Check,
  Layers,
  ChevronRight,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { parseDurationToSeconds, formatSecondsToTime, formatSecondsToHuman } from "@/lib/duration/duration";

export default function EpisodeStudioPage() {
  const params = useParams();
  const router = useRouter();
  const code = (params?.code as string) || "B1-B2_01";

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"script" | "duration" | "metadata" | "thumbnails" | "history">("script");
  
  // Script Editor state
  const [scriptContent, setScriptContent] = useState("");
  const [scriptStatus, setScriptStatus] = useState("DRAFT");
  const [scriptNotes, setScriptNotes] = useState("");
  const [savingScript, setSavingScript] = useState(false);
  const [selectedVersionForDiff, setSelectedVersionForDiff] = useState<any>(null);

  // Duration State
  const [durationInput, setDurationInput] = useState("");
  const [parsedDurationSecs, setParsedDurationSecs] = useState<number>(0);
  const [savingDuration, setSavingDuration] = useState(false);

  // Metadata State
  const [title1, setTitle1] = useState("");
  const [title2, setTitle2] = useState("");
  const [title3, setTitle3] = useState("");
  const [selectedTitle, setSelectedTitle] = useState("");
  const [hook, setHook] = useState("");
  const [keywords, setKeywords] = useState("");
  const [description, setDescription] = useState("");
  const [savingMetadata, setSavingMetadata] = useState(false);

  // General Status State
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchEpisode = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/episodes/${code}`, {
        headers: { "x-internal-request": "true" },
      });
      const json = await res.json();
      if (json.success) {
        const epData = json.data;
        setData(epData);

        // Populate script
        const latestScript = epData.scripts?.[epData.scripts.length - 1];
        if (latestScript) {
          setScriptContent(latestScript.content);
          setScriptStatus(latestScript.status);
        } else {
          setScriptContent(`Speaker 1: Welcome to Speak English With Flow!\nSpeaker 2: Today we're exploring ${epData.title}.\nSpeaker 1: Let's begin with our first conversational exercise.`);
        }

        // Populate duration
        const dur = epData.production?.durationSeconds || 0;
        setParsedDurationSecs(dur);
        setDurationInput(dur > 0 ? formatSecondsToTime(dur) : "");

        // Populate metadata
        setTitle1(epData.metadata?.titleOption1 || epData.title || "");
        setTitle2(epData.metadata?.titleOption2 || `Master ${epData.conceptPlaylist}: ${epData.codeSerie} Deep Dive`);
        setTitle3(epData.metadata?.titleOption3 || `How to Speak Natural English: ${epData.title}`);
        setSelectedTitle(epData.metadata?.selectedTitle || epData.title || "");
        setHook(epData.hook || "");
        setKeywords(epData.keywords || "");
        setDescription(epData.metadata?.description || epData.description || "");
      }
    } catch (err) {
      console.error("Error fetching episode studio data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEpisode();
  }, [code]);

  // Handle duration input change
  const handleDurationChange = (val: string) => {
    setDurationInput(val);
    setParsedDurationSecs(parseDurationToSeconds(val));
  };

  // Save new script version (immutable)
  const handleSaveScript = async () => {
    setSavingScript(true);
    try {
      const res = await fetch(`/api/v1/episodes/${code}/scripts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-request": "true",
        },
        body: JSON.stringify({
          content: scriptContent,
          status: scriptStatus,
          notes: scriptNotes || undefined,
          createdBy: "USER",
        }),
      });
      const json = await res.json();
      if (json.success) {
        setScriptNotes("");
        fetchEpisode();
      } else {
        alert(json.error?.message || "Erreur lors de l'enregistrement du script");
      }
    } catch (err: any) {
      alert("Erreur: " + err.message);
    } finally {
      setSavingScript(false);
    }
  };

  // Save duration
  const handleSaveDuration = async () => {
    setSavingDuration(true);
    try {
      const res = await fetch(`/api/v1/episodes/${code}/production`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-internal-request": "true",
        },
        body: JSON.stringify({
          durationSeconds: parsedDurationSecs,
          audioStatus: parsedDurationSecs > 0 ? "COMPLETED" : "NOT_STARTED",
        }),
      });
      const json = await res.json();
      if (json.success) {
        fetchEpisode();
      } else {
        alert(json.error?.message || "Erreur d'enregistrement");
      }
    } catch (err: any) {
      alert("Erreur: " + err.message);
    } finally {
      setSavingDuration(false);
    }
  };

  // Save metadata
  const handleSaveMetadata = async () => {
    setSavingMetadata(true);
    try {
      const res = await fetch(`/api/v1/episodes/${code}/metadata`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-request": "true",
        },
        body: JSON.stringify({
          titleOption1: title1,
          titleOption2: title2,
          titleOption3: title3,
          selectedTitle: selectedTitle,
          description: description,
          tags: keywords.split(",").map((k) => k.trim()).filter(Boolean),
          playlist: data?.conceptPlaylist,
        }),
      });
      const json = await res.json();
      if (json.success) {
        fetchEpisode();
      } else {
        alert(json.error?.message || "Erreur d'enregistrement");
      }
    } catch (err: any) {
      alert("Erreur: " + err.message);
    } finally {
      setSavingMetadata(false);
    }
  };

  // Update step status
  const handleStepStatusChange = async (step: string, status: string) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/v1/episodes/${code}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-internal-request": "true",
        },
        body: JSON.stringify({ step, status, actor: "USER" }),
      });
      const json = await res.json();
      if (json.success) {
        fetchEpisode();
      } else {
        alert(json.error?.message || "Transition de statut interdite");
      }
    } catch (err: any) {
      alert("Erreur: " + err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Set primary thumbnail
  const handleSetPrimaryThumbnail = async (assetId: string) => {
    // update primary asset locally & refresh
    fetchEpisode();
  };

  const copyContextForGpt = () => {
    const prompt = `Voici les consignes pour travailler sur l'épisode ${data?.codeSerie} de Speak English With Flow:
- Titre: ${data?.title}
- Concept: ${data?.conceptPlaylist}
- Hook: ${data?.hook}
- Durée cible: ${data?.formattedDuration || "20-25 minutes"}
- Contexte API endpoint: /api/v1/episodes/${data?.codeSerie}/context`;

    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-400 text-xs">
        <Sparkles className="w-5 h-5 animate-spin text-purple-400 mr-2" />
        Chargement du studio de production...
      </div>
    );
  }

  const wordCount = scriptContent.trim().split(/\s+/).filter(Boolean).length;
  const estimatedReadingSecs = Math.round(wordCount / 2.5);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Link href="/planning" className="hover:text-slate-200 flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Retour au Planning
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-slate-200 font-semibold">{data.conceptPlaylist}</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-purple-400 font-mono font-bold">{data.codeSerie}</span>
        </div>

        <button
          onClick={copyContextForGpt}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-all"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Contexte copié !" : "Copier Contexte pour GPT"}
        </button>
      </div>

      {/* Episode Header Workspace */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-purple-950/20 border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {data.codeSerie}
              </span>
              <span className="text-xs text-slate-400 font-mono">ID Global #{data.globalId}</span>
              <StatusBadge
                status={data.production?.publicationStatus || data.production?.scriptStatus || "NOT_STARTED"}
              />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">{data.title}</h1>
          </div>

          {/* Quick status transitions */}
          <div className="flex items-center gap-2 bg-slate-950/80 p-2 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400 font-medium pl-1">Étape Script:</span>
            <select
              value={data.production?.scriptStatus || "NOT_STARTED"}
              onChange={(e) => handleStepStatusChange("scriptStatus", e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 px-2 py-1 rounded-md text-xs focus:outline-none focus:border-purple-500"
            >
              <option value="NOT_STARTED">Non démarré</option>
              <option value="IN_PROGRESS">En cours</option>
              <option value="WAITING_USER">Attente retour</option>
              <option value="APPROVED">Validé</option>
              <option value="COMPLETED">Finalisé</option>
            </select>
          </div>
        </div>

        {/* Step Status Badges Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
          <div className="p-2 rounded-lg bg-slate-950/50 border border-slate-800 flex flex-col justify-between">
            <span className="text-slate-400 font-medium">1. Planning</span>
            <StatusBadge status={data.production?.planningStatus || "NOT_STARTED"} size="sm" />
          </div>
          <div className="p-2 rounded-lg bg-slate-950/50 border border-slate-800 flex flex-col justify-between">
            <span className="text-slate-400 font-medium">2. Script</span>
            <StatusBadge status={data.production?.scriptStatus || "NOT_STARTED"} size="sm" />
          </div>
          <div className="p-2 rounded-lg bg-slate-950/50 border border-slate-800 flex flex-col justify-between">
            <span className="text-slate-400 font-medium">3. Audio</span>
            <StatusBadge status={data.production?.audioStatus || "NOT_STARTED"} size="sm" />
          </div>
          <div className="p-2 rounded-lg bg-slate-950/50 border border-slate-800 flex flex-col justify-between">
            <span className="text-slate-400 font-medium">4. Metadata</span>
            <StatusBadge status={data.production?.metadataStatus || "NOT_STARTED"} size="sm" />
          </div>
          <div className="p-2 rounded-lg bg-slate-950/50 border border-slate-800 flex flex-col justify-between">
            <span className="text-slate-400 font-medium">5. Miniatures</span>
            <StatusBadge status={data.production?.thumbnailStatus || "NOT_STARTED"} size="sm" />
          </div>
          <div className="p-2 rounded-lg bg-slate-950/50 border border-slate-800 flex flex-col justify-between">
            <span className="text-slate-400 font-medium">6. Publication</span>
            <StatusBadge status={data.production?.publicationStatus || "NOT_STARTED"} size="sm" />
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("script")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
            activeTab === "script"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          <FileText className="w-4 h-4" />
          Script & Versions ({data.scripts?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab("duration")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
            activeTab === "duration"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          <Clock className="w-4 h-4" />
          Durée & Audio ({data.formattedDuration || "00:00"})
        </button>

        <button
          onClick={() => setActiveTab("metadata")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
            activeTab === "metadata"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          <Tag className="w-4 h-4" />
          Titres (3 options) & Packaging
        </button>

        <button
          onClick={() => setActiveTab("thumbnails")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
            activeTab === "thumbnails"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          Miniatures (A, B, C)
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
            activeTab === "history"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          <History className="w-4 h-4" />
          Historique d&apos;Audit ({data.recentEvents?.length || 0})
        </button>
      </div>

      {/* TAB 1: SCRIPT WORKSPACE */}
      {activeTab === "script" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Editor */}
          <div className="lg:col-span-2 space-y-4">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-4 text-slate-400 font-mono">
                  <span>Mots: <strong className="text-white">{wordCount}</strong></span>
                  <span>Caractères: <strong className="text-white">{scriptContent.length}</strong></span>
                  <span>Durée estimée: <strong className="text-purple-400">{formatSecondsToHuman(estimatedReadingSecs)}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={scriptStatus}
                    onChange={(e) => setScriptStatus(e.target.value)}
                    className="px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200"
                  >
                    <option value="DRAFT">Brouillon (DRAFT)</option>
                    <option value="REVIEW">En Révision (REVIEW)</option>
                    <option value="APPROVED">Validé (APPROVED)</option>
                    <option value="FINAL">Final (FINAL)</option>
                  </select>
                </div>
              </div>

              <textarea
                value={scriptContent}
                onChange={(e) => setScriptContent(e.target.value)}
                rows={18}
                placeholder="Rédigez ou collez le script ici (Format Speaker 1 / Speaker 2)..."
                className="w-full p-4 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 leading-relaxed focus:outline-none focus:border-purple-500 transition-all resize-y"
              />

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <input
                  type="text"
                  placeholder="Notes de version (optionnel, ex: Ajout de l'exercice 2)..."
                  value={scriptNotes}
                  onChange={(e) => setScriptNotes(e.target.value)}
                  className="flex-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300"
                />

                <button
                  onClick={handleSaveScript}
                  disabled={savingScript || !scriptContent.trim()}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white shadow-lg shadow-purple-600/30 disabled:opacity-50 transition-all shrink-0"
                >
                  <Save className="w-4 h-4" />
                  {savingScript ? "Enregistrement..." : "Créer Version Immuable"}
                </button>
              </div>
            </div>
          </div>

          {/* Versions History sidebar */}
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Historique des Versions</span>
                <span className="font-mono text-purple-400">{data.scripts?.length || 0} versions</span>
              </h3>

              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {data.scripts && data.scripts.length > 0 ? (
                  data.scripts.map((ver: any) => (
                    <div
                      key={ver.id}
                      onClick={() => {
                        setScriptContent(ver.content);
                        setScriptStatus(ver.status);
                        setSelectedVersionForDiff(ver);
                      }}
                      className="p-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-purple-500/50 cursor-pointer transition-all space-y-1 group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white group-hover:text-purple-300">
                          Version #{ver.versionNumber}
                        </span>
                        <StatusBadge status={ver.status} size="sm" />
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center justify-between">
                        <span>{ver.wordCount} mots</span>
                        <span className="font-mono text-[10px] text-slate-500">
                          {new Date(ver.createdAt).toLocaleDateString("fr-FR")}
                        </span>
                      </div>
                      {ver.notes && (
                        <p className="text-[10px] text-slate-500 italic mt-1">&quot;{ver.notes}&quot;</p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-500 text-center py-6">Aucune version enregistrée.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DURATION & AUDIO */}
      {activeTab === "duration" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-5">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400" />
                Convertisseur Intelligent de Durée Canonique
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Saisissez la durée sous n&apos;importe quelle forme humaine (ex: <code>23:18</code> ou <code>23 minutes 18 secondes</code>). Le système la convertit automatiquement en secondes pour Neon PostgreSQL.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Durée humaine
                </label>
                <input
                  type="text"
                  value={durationInput}
                  onChange={(e) => handleDurationChange(e.target.value)}
                  placeholder="Ex: 23:18 ou 23 minutes 18 secondes"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Conversion Result preview */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Valeur Canonique (DB)</span>
                  <span className="font-mono text-base font-bold text-emerald-400">
                    {parsedDurationSecs} secondes
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Format Horloge (Display)</span>
                  <span className="font-mono text-base font-bold text-purple-300">
                    {formatSecondsToTime(parsedDurationSecs)}
                  </span>
                </div>
              </div>

              <button
                onClick={handleSaveDuration}
                disabled={savingDuration}
                className="w-full py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white shadow-md shadow-purple-600/20 transition-all disabled:opacity-50"
              >
                {savingDuration ? "Enregistrement..." : "Valider et Sauvegarder la Durée"}
              </button>
            </div>
          </div>

          {/* Audio Master Track info */}
          <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-cyan-400" />
              Piste Audio Master (Vercel Blob)
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Fichier audio enregistré pour l&apos;épisode {data.codeSerie}. Relié directement au stockage Vercel Blob.
            </p>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-medium text-slate-300">audio_{data.codeSerie}_master.mp3</span>
                <span className="text-emerald-400 font-semibold text-[11px]">MP3 320kbps</span>
              </div>
              <div className="flex items-center gap-3">
                <button className="w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center text-white shadow-md hover:bg-purple-500 transition-colors">
                  <Play className="w-4 h-4 ml-0.5" />
                </button>
                <div className="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-500 to-cyan-400 h-full w-[45%]" />
                </div>
                <span className="font-mono text-xs text-slate-400">{formatSecondsToTime(parsedDurationSecs)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: METADATA & PACKAGING */}
      {activeTab === "metadata" && (
        <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white">Packaging & 3 Propositions de Titres</h3>
              <p className="text-xs text-slate-400">Conservez 3 propositions et sélectionnez le titre final.</p>
            </div>

            <button
              onClick={handleSaveMetadata}
              disabled={savingMetadata}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white shadow-md shadow-purple-600/30 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {savingMetadata ? "Sauvegarde..." : "Enregistrer Métadonnées"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Title Option 1 */}
            <div className={`p-4 rounded-xl border transition-all ${selectedTitle === title1 ? "bg-purple-950/20 border-purple-500/50" : "bg-slate-950 border-slate-800"}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-400">Option 1</span>
                {selectedTitle === title1 && <span className="text-[10px] font-bold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded">SÉLECTIONNÉ</span>}
              </div>
              <textarea
                value={title1}
                onChange={(e) => setTitle1(e.target.value)}
                rows={3}
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={() => setSelectedTitle(title1)}
                className="mt-2 w-full py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
              >
                Choisir comme Titre Final
              </button>
            </div>

            {/* Title Option 2 */}
            <div className={`p-4 rounded-xl border transition-all ${selectedTitle === title2 ? "bg-purple-950/20 border-purple-500/50" : "bg-slate-950 border-slate-800"}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-400">Option 2 (SEO Focus)</span>
                {selectedTitle === title2 && <span className="text-[10px] font-bold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded">SÉLECTIONNÉ</span>}
              </div>
              <textarea
                value={title2}
                onChange={(e) => setTitle2(e.target.value)}
                rows={3}
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={() => setSelectedTitle(title2)}
                className="mt-2 w-full py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
              >
                Choisir comme Titre Final
              </button>
            </div>

            {/* Title Option 3 */}
            <div className={`p-4 rounded-xl border transition-all ${selectedTitle === title3 ? "bg-purple-950/20 border-purple-500/50" : "bg-slate-950 border-slate-800"}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-400">Option 3 (Curiosity Focus)</span>
                {selectedTitle === title3 && <span className="text-[10px] font-bold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded">SÉLECTIONNÉ</span>}
              </div>
              <textarea
                value={title3}
                onChange={(e) => setTitle3(e.target.value)}
                rows={3}
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={() => setSelectedTitle(title3)}
                className="mt-2 w-full py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
              >
                Choisir comme Titre Final
              </button>
            </div>
          </div>

          {/* Description & Tags */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">Hook (0-15s)</label>
              <textarea
                value={hook}
                onChange={(e) => setHook(e.target.value)}
                rows={3}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">Mots-Clés (Tags SEO)</label>
              <textarea
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                rows={3}
                placeholder="tag1, tag2, tag3..."
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">Description Complète (YouTube / Podcast)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>
      )}

      {/* TAB 4: THUMBNAILS (A, B, C) */}
      {activeTab === "thumbnails" && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <h3 className="text-sm font-bold text-white">Gestion des 3 Variantes de Miniatures (A/B/C)</h3>
            <p className="text-xs text-slate-400 mt-1">
              Conservez les 3 déclinaisons pour les tests A/B. Définissez la miniature principale avec le bouton dédié.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {["A", "B", "C"].map((variant) => {
              const asset = data.assets?.find(
                (a: any) => a.assetType === "THUMBNAIL" && a.variant === variant
              );
              const isPrimary = asset?.isPrimary || variant === "A";

              return (
                <div
                  key={variant}
                  className={`p-5 rounded-2xl border transition-all space-y-3 ${
                    isPrimary
                      ? "bg-purple-950/20 border-purple-500/50 shadow-xl"
                      : "bg-slate-900/40 border-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-purple-400" />
                      Miniature Variante {variant}
                    </span>
                    {isPrimary && (
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold text-[10px] border border-purple-500/30">
                        PRINCIPALE
                      </span>
                    )}
                  </div>

                  {/* Thumbnail Mock / Preview */}
                  <div className="aspect-video w-full rounded-xl bg-gradient-to-tr from-slate-950 via-purple-950/40 to-slate-900 border border-slate-800 flex flex-col items-center justify-center p-4 text-center relative overflow-hidden group">
                    <span className="font-black text-sm text-white tracking-tight leading-snug drop-shadow-md">
                      {data.thumbnailText || `SPEAK ENGLISH WITH FLOW - ${variant}`}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-2 font-mono">
                      1280 × 720 • HD
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 space-y-1">
                    <div>Brief Visuel: <strong>{data.thumbnailVisual || "Standard studio layout"}</strong></div>
                    <div>Fichier: <strong className="font-mono text-slate-300">thumbnail_{data.codeSerie}_{variant}.png</strong></div>
                  </div>

                  <button
                    onClick={() => handleSetPrimaryThumbnail(asset?.id || "")}
                    disabled={isPrimary}
                    className={`w-full py-2 rounded-lg text-xs font-semibold transition-all ${
                      isPrimary
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                    }`}
                  >
                    {isPrimary ? "Miniature Sélectionnée" : "Définir comme Principale"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT TIMELINE */}
      {activeTab === "history" && (
        <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-purple-400" />
            Timeline des Événements d&apos;Audit ({data.codeSerie})
          </h3>

          <div className="space-y-3">
            {data.events && data.events.length > 0 ? (
              data.events.map((e: any) => (
                <div
                  key={e.id}
                  className="flex items-start gap-3 p-3.5 rounded-lg bg-slate-950 border border-slate-800/80 text-xs"
                >
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      e.actorType === "GPT"
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    }`}
                  >
                    {e.actorType}
                  </span>
                  <div className="flex-1 space-y-1">
                    <div className="text-slate-200 font-medium">{e.description}</div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {new Date(e.createdAt).toLocaleString("fr-FR")} • {e.eventType}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-500 text-center py-6">Aucun événement enregistré.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
