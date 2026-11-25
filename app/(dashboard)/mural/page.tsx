"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Megaphone,
  Plus,
  Trash2,
  Clock,
  Loader2,
  ShieldAlert,
  Sparkles,
  UserCheck,
  AlertTriangle,
  Info,
} from "lucide-react";
import SectionComponent from "@/components/SectionComponent";
import TittleHeader from "@/components/TittleHeader";
import Breadcrumb from "@/components/Breadcrumb";
import Modal from "@/components/Modal";
import InputField from "@/components/InputField";
import SubmitButton from "@/components/SubmitButton";
import CorporateMiniCalendar, {
  type CorporateEventItem,
} from "@/components/CorporateMiniCalendar";

interface MuralPostItem {
  id: string;
  title: string;
  content: string;
  priority: "NORMAL" | "IMPORTANT" | "URGENT" | string;
  durationMinutes: number;
  expiresAt: string;
  showInAdmission: boolean;
  authorId: string;
  authorName: string;
  createdAt: string;
}

const DURATION_PRESETS = [
  { label: "5 min", minutes: 5 },
  { label: "1 hora", minutes: 60 },
  { label: "6 horas", minutes: 360 },
  { label: "24 horas", minutes: 1440 },
  { label: "3 dias", minutes: 4320 },
  { label: "7 dias", minutes: 10080 },
  { label: "15 dias", minutes: 21600 },
  { label: "30 dias", minutes: 43200 },
];

const PRIORITY_STYLE: Record<
  string,
  { label: string; border: string; badge: string }
> = {
  NORMAL: {
    label: "Comunicado",
    border: "border-l-4 border-l-blue-500",
    badge: "bg-blue-50 text-blue-600 border-blue-100",
  },
  IMPORTANT: {
    label: "Importante",
    border: "border-l-4 border-l-amber-500",
    badge: "bg-amber-50 text-amber-700 border-amber-100",
  },
  URGENT: {
    label: "Urgente",
    border: "border-l-4 border-l-rose-500",
    badge: "bg-rose-50 text-rose-600 border-rose-100",
  },
};

function formatRemainingTime(expiresAtIso: string, nowMs: number): string {
  const diffMs = new Date(expiresAtIso).getTime() - nowMs;
  if (diffMs <= 0) return "Expirando...";

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h restantes`;
  if (hours > 0) return `${hours}h ${minutes}min restantes`;
  if (minutes > 0) return `${minutes}min ${seconds}s restantes`;
  return `${seconds}s restantes`;
}

export default function MuralPage() {
  const [loading, setLoading] = useState(true);
  const [isHost, setIsHost] = useState(false);
  const [posts, setPosts] = useState<MuralPostItem[]>([]);
  const [events, setEvents] = useState<CorporateEventItem[]>([]);
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Modal de nova comunicação
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [selectedPreset, setSelectedPreset] = useState<number | "CUSTOM">(10080); // 7 dias padrão
  const [customAmount, setCustomAmount] = useState("2");
  const [customUnit, setCustomUnit] = useState<"MINUTES" | "HOURS" | "DAYS">("HOURS");
  const [showInAdmission, setShowInAdmission] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch("/api/mural");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setPosts(json.data);
      }
    } catch (err) {
      console.error("Erro ao carregar mural:", err);
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/calendario");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setEvents(json.data);
      }
    } catch (err) {
      console.error("Erro ao carregar calendário:", err);
    }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const meRes = await fetch("/api/auth/me");
        const meJson = await meRes.json();
        if (meJson.success && meJson.data) {
          setIsHost(meJson.data.role === "ADMIN");
        }
        await Promise.all([fetchPosts(), fetchEvents()]);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [fetchPosts, fetchEvents]);

  // Atualiza contagem regressiva e sincroniza com o banco quando alguma comunicação expirar
  useEffect(() => {
    const interval = setInterval(() => {
      const current = Date.now();
      setNowMs(current);

      const hasExpired = posts.some(
        (p) => new Date(p.expiresAt).getTime() <= current,
      );
      if (hasExpired) {
        fetchPosts();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [posts, fetchPosts]);

  const computedDurationMinutes = useMemo(() => {
    if (selectedPreset !== "CUSTOM") return selectedPreset;
    const val = parseInt(customAmount, 10);
    if (!Number.isFinite(val) || val < 1) return 0;
    if (customUnit === "MINUTES") return val;
    if (customUnit === "HOURS") return val * 60;
    return val * 1440;
  }, [selectedPreset, customAmount, customUnit]);

  const expirationPreview = useMemo(() => {
    if (computedDurationMinutes < 1) return null;
    const target = new Date(nowMs + computedDurationMinutes * 60 * 1000);
    return target.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [computedDurationMinutes, nowMs]);

  const openNewPostModal = () => {
    setTitle("");
    setContent("");
    setPriority("NORMAL");
    setSelectedPreset(10080);
    setCustomAmount("2");
    setCustomUnit("HOURS");
    setShowInAdmission(true);
    setError(null);
    setIsModalOpen(true);
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Informe o título da comunicação.");
      return;
    }

    if (!content.trim()) {
      setError("Escreva a mensagem da comunicação.");
      return;
    }

    if (computedDurationMinutes < 1 || computedDurationMinutes > 365 * 24 * 60) {
      setError("Defina um tempo ativo válido (mínimo 1 minuto, máximo 365 dias).");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/mural", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          priority,
          durationMinutes: computedDurationMinutes,
          showInAdmission,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || "Erro ao publicar comunicação.");
        return;
      }

      setIsModalOpen(false);
      await fetchPosts();
    } catch {
      setError("Erro de rede ao publicar comunicação.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/mural/${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchPosts();
      }
    } catch (err) {
      console.error("Erro ao excluir comunicação:", err);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-sm text-stone-500 font-medium animate-pulse">
          Carregando mural de comunicação...
        </p>
      </div>
    );
  }

  return (
    <SectionComponent>
      <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <TittleHeader
            tittle="Mural de Comunicação"
            description="Comunicados oficiais temporários e calendário corporativo da empresa."
          />
          <div className="mt-2">
            <Breadcrumb
              items={[
                { label: "Dashboard", href: isHost ? "/" : "/dashboard" },
                { label: "Mural de Comunicação" },
              ]}
            />
          </div>
        </div>

        {isHost && (
          <button
            type="button"
            onClick={openNewPostModal}
            className="flex items-center justify-center gap-2 bg-[#3B82F6] hover:bg-blue-600 text-white px-5 py-3 rounded-xl font-semibold shadow-md transition-all active:scale-95 cursor-pointer text-sm shrink-0"
          >
            <Plus size={18} strokeWidth={2.5} />
            Nova Comunicação
          </button>
        )}
      </div>

      {/* Grade Principal: Mural (Esquerda) + Mini Calendário Corporativo (Direita) */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Coluna Esquerda: Comunicados do Mural */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          <div className="bg-white rounded-3xl border border-stone-100 shadow-md p-6">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <Megaphone size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-stone-800">
                    Comunicados Ativos
                  </h2>
                  <p className="text-[11px] text-stone-400">
                    Publicações são removidas automaticamente após o prazo definido
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold bg-stone-100 text-stone-600 px-3 py-1 rounded-full">
                {posts.length} {posts.length === 1 ? "ativo" : "ativos"}
              </span>
            </div>

            {posts.length === 0 ? (
              <div className="py-14 flex flex-col items-center justify-center text-center gap-3 bg-stone-50/60 rounded-2xl border border-dashed border-stone-200">
                <Sparkles size={28} className="text-stone-300" />
                <div>
                  <p className="text-sm font-bold text-stone-600">
                    Nenhuma comunicação ativa no momento
                  </p>
                  <p className="text-xs text-stone-400 mt-1">
                    {isHost
                      ? "Clique em \"Nova Comunicação\" para publicar um aviso com tempo de expiração."
                      : "Quando o RH publicar novos avisos, eles aparecerão aqui."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => {
                  const style =
                    PRIORITY_STYLE[post.priority] || PRIORITY_STYLE.NORMAL;
                  const remaining = formatRemainingTime(post.expiresAt, nowMs);

                  return (
                    <article
                      key={post.id}
                      className={`bg-stone-50/50 hover:bg-stone-50 transition-colors rounded-2xl border border-stone-200/70 p-5 ${style.border}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1 ${style.badge}`}
                          >
                            {post.priority === "URGENT" ? (
                              <AlertTriangle size={11} />
                            ) : (
                              <Info size={11} />
                            )}
                            {style.label}
                          </span>

                          <span className="text-[11px] font-semibold text-stone-500 bg-white border border-stone-200/80 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                            <Clock size={11} className="text-blue-500" />
                            {remaining}
                          </span>

                          {isHost && post.showInAdmission && (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                              <UserCheck size={11} />
                              Visível na admissão
                            </span>
                          )}
                        </div>

                        {isHost && (
                          <button
                            type="button"
                            onClick={() => handleDeletePost(post.id)}
                            disabled={deletingId === post.id}
                            className="text-stone-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                            title="Excluir comunicação agora"
                          >
                            {deletingId === post.id ? (
                              <Loader2 size={15} className="animate-spin" />
                            ) : (
                              <Trash2 size={15} />
                            )}
                          </button>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-stone-800 mt-3">
                        {post.title}
                      </h3>
                      <p className="text-sm text-stone-600 mt-1.5 whitespace-pre-wrap leading-relaxed">
                        {post.content}
                      </p>

                      <div className="mt-4 pt-3 border-t border-stone-200/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-400">
                        <span>
                          Publicado por{" "}
                          <strong className="text-stone-600">
                            {post.authorName}
                          </strong>{" "}
                          em{" "}
                          {new Date(post.createdAt).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span>
                          Expira em{" "}
                          {new Date(post.expiresAt).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Coluna Direita: Mini Calendário Corporativo */}
        <div className="lg:col-span-5 xl:col-span-4">
          <CorporateMiniCalendar
            events={events}
            isHost={isHost}
            onRefresh={fetchEvents}
          />
        </div>
      </div>

      {/* Modal de Nova Comunicação (Host) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nova Comunicação no Mural"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreatePost} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-stone-600 uppercase tracking-wider">
              Título *
            </label>
            <InputField
              type="text"
              placeholder="Ex: Aviso importante sobre o feriado"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              classNameInput="text-sm text-stone-700"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-stone-600 uppercase tracking-wider">
              Mensagem *
            </label>
            <textarea
              rows={4}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escreva a comunicação que ficará visível no mural..."
              className="w-full px-3.5 py-2.5 border border-stone-400/50 rounded-xl text-sm text-stone-700 outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-stone-600 uppercase tracking-wider">
              Prioridade
            </label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(PRIORITY_STYLE).map(([key, item]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPriority(key)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    priority === key
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tempo ativo do mural */}
          <div className="flex flex-col gap-2 bg-stone-50 p-4 rounded-2xl border border-stone-200/70">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={14} className="text-blue-500" />
              Tempo que ficará ativo *
            </label>
            <p className="text-[11px] text-stone-500">
              Após esse prazo, a comunicação é excluída automaticamente do mural e do banco de dados.
            </p>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {DURATION_PRESETS.map((preset) => (
                <button
                  key={preset.minutes}
                  type="button"
                  onClick={() => setSelectedPreset(preset.minutes)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                    selectedPreset === preset.minutes
                      ? "bg-[#3B82F6] text-white border-[#3B82F6]"
                      : "bg-white text-stone-600 border-stone-200 hover:bg-stone-100"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelectedPreset("CUSTOM")}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                  selectedPreset === "CUSTOM"
                    ? "bg-[#3B82F6] text-white border-[#3B82F6]"
                    : "bg-white text-stone-600 border-stone-200 hover:bg-stone-100"
                }`}
              >
                Personalizado
              </button>
            </div>

            {selectedPreset === "CUSTOM" && (
              <div className="grid grid-cols-2 gap-2 pt-2">
                <input
                  type="number"
                  min={1}
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="px-3 py-2 bg-white border border-stone-300 rounded-xl text-sm font-semibold text-stone-700 outline-none focus:border-blue-500"
                  placeholder="Quantidade"
                />
                <select
                  value={customUnit}
                  onChange={(e) =>
                    setCustomUnit(
                      e.target.value as "MINUTES" | "HOURS" | "DAYS",
                    )
                  }
                  className="px-3 py-2 bg-white border border-stone-300 rounded-xl text-sm font-semibold text-stone-700 outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="MINUTES">Minuto(s)</option>
                  <option value="HOURS">Hora(s)</option>
                  <option value="DAYS">Dia(s)</option>
                </select>
              </div>
            )}

            {expirationPreview && (
              <p className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 mt-1">
                Exclusão automática programada para:{" "}
                <strong>{expirationPreview}</strong>
              </p>
            )}
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none px-1">
            <input
              type="checkbox"
              checked={showInAdmission}
              onChange={(e) => setShowInAdmission(e.target.checked)}
              className="h-4 w-4 rounded border-stone-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span className="text-xs font-semibold text-stone-600">
              Exibir também no portal de admissão de novos colaboradores
            </span>
          </label>

          {error && (
            <div className="flex items-center gap-2 text-red-700 text-xs font-semibold bg-red-50 border border-red-100 px-3 py-2 rounded-xl">
              <ShieldAlert size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-bold text-xs hover:bg-stone-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <div className="flex-1">
              <SubmitButton
                text={submitting ? "Publicando..." : "Publicar no Mural"}
                disabled={submitting}
              />
            </div>
          </div>
        </form>
      </Modal>
    </SectionComponent>
  );
}
