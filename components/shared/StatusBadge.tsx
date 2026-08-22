import React from "react";
import { ProductionStatus, ScriptStatus } from "@/db/schema";

interface StatusBadgeProps {
  status: ProductionStatus | ScriptStatus | string;
  className?: string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, className = "", size = "md" }: StatusBadgeProps) {
  let bg = "bg-slate-800/80 text-slate-300 border-slate-700";
  let dot = "bg-slate-400";
  let label = status;

  switch (status) {
    case "COMPLETED":
    case "FINAL":
      bg = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      dot = "bg-emerald-400";
      label = status === "FINAL" ? "Final / Prêt" : "Terminé";
      break;
    case "APPROVED":
      bg = "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
      dot = "bg-cyan-400";
      label = "Validé";
      break;
    case "READY":
      bg = "bg-blue-500/10 text-blue-400 border-blue-500/30";
      dot = "bg-blue-400";
      label = "Prêt";
      break;
    case "IN_PROGRESS":
    case "REVIEW":
      bg = "bg-amber-500/10 text-amber-400 border-amber-500/30";
      dot = "bg-amber-400 animate-pulse";
      label = status === "REVIEW" ? "En révision" : "En cours";
      break;
    case "WAITING_USER":
      bg = "bg-purple-500/10 text-purple-400 border-purple-500/30";
      dot = "bg-purple-400 animate-pulse";
      label = "Attente utilisateur";
      break;
    case "DRAFT":
      bg = "bg-indigo-500/10 text-indigo-400 border-indigo-500/30";
      dot = "bg-indigo-400";
      label = "Brouillon";
      break;
    case "BLOCKED":
      bg = "bg-rose-500/10 text-rose-400 border-rose-500/30";
      dot = "bg-rose-400";
      label = "Bloqué";
      break;
    case "NOT_STARTED":
    default:
      bg = "bg-slate-800/80 text-slate-400 border-slate-700/60";
      dot = "bg-slate-500";
      label = "Non démarré";
      break;
  }

  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${bg} ${sizeClasses} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
