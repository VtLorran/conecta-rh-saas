"use client";

import { useEffect, useState } from "react";
import {
  UserMinus,
  Search,
  Loader2,
  Building2,
  CalendarClock,
  ShieldAlert,
  Info,
} from "lucide-react";

interface Termination {
  id: string;
  employeeName: string;
  sector: string;
  justification: string;
  dismissedByName: string | null;
  terminatedAt: string;
}

export default function CentralDemissoes() {
  const [records, setRecords] = useState<Termination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchTerminations() {
      try {
        setLoading(true);
        const res = await fetch("/api/colaboradores/demissoes");
        const json = await res.json();
        if (json.success) {
          setRecords(json.data || []);
          setError(null);
        } else {
          setError(json.message || "Erro ao carregar demissões.");
        }
      } catch {
        setError("Erro de conexão ao carregar demissões.");
      } finally {
        setLoading(false);
      }
    }
    fetchTerminations();
  }, []);

  const filtered = records.filter(
    (r) =>
      r.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.sector.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="w-full flex flex-col items-center justify-center gap-3 py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-stone-500 font-semibold text-sm">
          Carregando registros de demissões...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full flex flex-col items-center justify-center gap-3 py-20 text-center">
        <ShieldAlert className="h-8 w-8 text-rose-400" />
        <p className="text-stone-600 font-semibold text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Cabeçalho + Busca */}
      <div className="bg-white p-6 rounded-3xl shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <UserMinus size={22} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-700 uppercase tracking-wider">
              Registros de Demissões
            </h3>
            <p className="text-xs text-stone-400">
              {records.length}{" "}
              {records.length === 1 ? "registro histórico" : "registros históricos"}
            </p>
          </div>
        </div>

        <div className="relative w-full md:max-w-sm">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
            size={16}
          />
          <input
            type="text"
            placeholder="Buscar por nome ou setor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-stone-50 border border-stone-200/80 rounded-2xl py-2.5 pl-11 pr-4 text-sm focus:outline-none text-stone-700"
          />
        </div>
      </div>

      {/* Lista / Tabela */}
      {filtered.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center text-center gap-2 bg-white rounded-3xl shadow-lg">
          <Info size={32} className="text-stone-300" />
          <p className="text-stone-500 font-semibold text-sm">
            {records.length === 0
              ? "Nenhuma demissão registrada até o momento."
              : "Nenhum registro corresponde à sua busca."}
          </p>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-3xl shadow-lg space-y-3">
          {/* Cabeçalho (desktop) */}
          <div className="hidden md:grid grid-cols-12 gap-4 pb-3 border-b border-stone-100 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
            <span className="col-span-3">Colaborador</span>
            <span className="col-span-2">Setor</span>
            <span className="col-span-4">Justificativa</span>
            <span className="col-span-2">Demitido por</span>
            <span className="col-span-1 text-right">Data/Hora</span>
          </div>

          {/* Registros */}
          {filtered.map((r) => (
            <div
              key={r.id}
              className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 py-3 border-b border-stone-50 last:border-b-0 hover:bg-stone-50/50 rounded-xl transition-colors"
            >
              <div className="md:col-span-3 flex items-center gap-2 min-w-0">
                <span className="font-semibold text-stone-700 text-sm truncate">
                  {r.employeeName}
                </span>
              </div>
              <div className="md:col-span-2 flex items-center gap-1.5 min-w-0">
                <Building2 size={13} className="text-stone-400 shrink-0" />
                <span className="text-xs font-semibold text-stone-600 truncate">
                  {r.sector}
                </span>
              </div>
              <div className="md:col-span-4">
                <span className="text-xs text-stone-500 leading-relaxed">
                  {r.justification}
                </span>
              </div>
              <div className="md:col-span-2">
                <span className="text-xs font-medium text-stone-500">
                  {r.dismissedByName || "—"}
                </span>
              </div>
              <div className="md:col-span-1 flex md:justify-end items-center gap-1.5">
                <CalendarClock size={13} className="text-stone-400 shrink-0 md:hidden" />
                <span className="text-[11px] font-medium text-stone-500 whitespace-nowrap">
                  {formatDate(r.terminatedAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
