"use client";

import React, { useState } from "react";
import {
  Key,
  Copy,
  Check,
  Sparkles,
  Database,
  ExternalLink,
  ShieldCheck,
  BookOpen,
  Code,
} from "lucide-react";

export default function SettingsPage() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const gptInstructionPrompt = `Tu es l'agent éditorial et de production de la chaîne "Speak English With Flow".
Tu interagis directement avec l'API Flow Content Factory pour gérer la production de manière persistante et sans dépendre de la mémoire conversationnelle.

RÈGLES DE PRODUCTION :
1. Au démarrage d'une session, appelle GET /api/v1/production/next pour identifier le prochain épisode à produire sans halluciner.
2. Appelle GET /api/v1/episodes/{code}/context pour charger l'intégralité du brief, de l'identité et de l'historique de l'épisode.
3. Rédige le script au format Speaker 1 / Speaker 2 validé.
4. Une fois validé avec l'utilisateur, enregistre le script via POST /api/v1/episodes/{code}/scripts avec le statut "APPROVED" ou "FINAL".
5. Lorsque l'utilisateur fournit la durée audio (ex: "23:18"), envoie la mise à jour via PATCH /api/v1/episodes/{code}/production.
6. Génère 3 options de titres, le hook, la description et les tags, puis enregistre-les via POST /api/v1/episodes/{code}/metadata.
7. Ne fais jamais de transition de statut arbitraire sans validation.`;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          Paramètres & Intégration GPT
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Gestion des clés API sécurisées, configuration des Custom GPT Actions et monitoring de la persistance.
        </p>
      </div>

      {/* API Keys Panel */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Key className="w-4 h-4 text-purple-400" />
          Clés d&apos;Authentification API (Côté Serveur)
        </h2>
        <p className="text-xs text-slate-400">
          Utilisez ces clés dans le header <code>Authorization: Bearer &lt;CLÉ&gt;</code> ou <code>x-api-key: &lt;CLÉ&gt;</code> pour autoriser vos agents GPT ou scripts externes.
        </p>

        <div className="space-y-3 pt-2">
          {/* GPT Production Key */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                Clé Agent GPT Production (Lecture & Écriture)
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30">
                  GPT_PRODUCTION
                </span>
              </div>
              <div className="font-mono text-xs text-slate-400">fcf_live_gpt_prod_secret_key_8923</div>
            </div>
            <button
              onClick={() => copyToClipboard("fcf_live_gpt_prod_secret_key_8923", "gpt_prod")}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              {copiedKey === "gpt_prod" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedKey === "gpt_prod" ? "Copié !" : "Copier"}
            </button>
          </div>

          {/* GPT Readonly Key */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                Clé Agent Lecture Seule
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30">
                  GPT_READONLY
                </span>
              </div>
              <div className="font-mono text-xs text-slate-400">fcf_live_gpt_readonly_key_1042</div>
            </div>
            <button
              onClick={() => copyToClipboard("fcf_live_gpt_readonly_key_1042", "gpt_read")}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              {copiedKey === "gpt_read" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedKey === "gpt_read" ? "Copié !" : "Copier"}
            </button>
          </div>

          {/* Admin Key */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                Clé Super Administrateur
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  ADMIN
                </span>
              </div>
              <div className="font-mono text-xs text-slate-400">fcf_live_admin_secret_key_9999</div>
            </div>
            <button
              onClick={() => copyToClipboard("fcf_live_admin_secret_key_9999", "admin")}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              {copiedKey === "admin" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedKey === "admin" ? "Copié !" : "Copier"}
            </button>
          </div>
        </div>
      </div>

      {/* Custom GPT Action Setup */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          Configuration Custom GPT Action (OpenAI)
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Pour connecter votre Custom GPT à Flow Content Factory, créez une nouvelle <strong>Action</strong> dans le GPT Builder et importez le schéma OpenAPI.
        </p>

        <div className="space-y-3 pt-1">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="text-xs">
              <span className="text-slate-400">URL du schéma OpenAPI :</span>{" "}
              <strong className="font-mono text-purple-300">/api/openapi.json</strong> ou <strong className="font-mono text-purple-300">/openapi.yaml</strong>
            </div>
            <a
              href="/api/openapi.json"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 px-3 py-1 rounded bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 text-xs font-semibold border border-purple-500/30"
            >
              Voir le Schéma <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span>Prompt d&apos;Instruction Recommandé pour le Custom GPT :</span>
              <button
                onClick={() => copyToClipboard(gptInstructionPrompt, "gpt_prompt")}
                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
              >
                {copiedKey === "gpt_prompt" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedKey === "gpt_prompt" ? "Prompt copié !" : "Copier le Prompt"}
              </button>
            </div>
            <textarea
              readOnly
              value={gptInstructionPrompt}
              rows={8}
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg font-mono text-[11px] text-slate-400 leading-relaxed focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Storage & Persistence Status */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-400" />
          Statut de l&apos;Infrastructure de Persistance
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200">Neon PostgreSQL</span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Actif & Synchronisé
              </span>
            </div>
            <p className="text-slate-400 text-[11px]">
              Stocke les 45 épisodes, l&apos;état de production, les versions immuables de scripts, les métadonnées et l&apos;historique complet.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200">Vercel Blob Storage</span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Prêt pour Upload
              </span>
            </div>
            <p className="text-slate-400 text-[11px]">
              Stocke les fichiers binaires volumineux : audio master mp3, miniatures HD variantes A/B/C et sous-titres.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
