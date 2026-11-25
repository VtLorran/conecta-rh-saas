"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Trash2,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import Modal from "@/components/Modal";
import InputField from "@/components/InputField";
import SubmitButton from "@/components/SubmitButton";

export interface CorporateEventItem {
  id: string;
  title: string;
  description: string | null;
  eventDate: string;
  startTime: string | null;
  category: string;
  createdAt?: string;
}

interface CorporateMiniCalendarProps {
  events: CorporateEventItem[];
  isHost: boolean;
  onRefresh: () => Promise<void> | void;
  compact?: boolean;
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const CATEGORY_META: Record<
  string,
  { label: string; dot: string; badge: string }
> = {
  EVENTO: {
    label: "Evento",
    dot: "bg-blue-500",
    badge: "bg-blue-50 text-blue-600 border-blue-100",
  },
  REUNIAO: {
    label: "Reunião",
    dot: "bg-indigo-500",
    badge: "bg-indigo-50 text-indigo-600 border-indigo-100",
  },
  FERIADO: {
    label: "Feriado",
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700 border-amber-100",
  },
  INTEGRACAO: {
    label: "Integração",
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
};

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function eventDateKey(iso: string): string {
  return iso.slice(0, 10);
}

function formatDateBr(dateKey: string): string {
  const [y, m, d] = dateKey.split("-");
  if (!y || !m || !d) return dateKey;
  return `${d}/${m}/${y}`;
}

export default function CorporateMiniCalendar({
  events,
  isHost,
  onRefresh,
  compact = false,
}: CorporateMiniCalendarProps) {
  const todayKey = toDateKey(new Date());
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedKey, setSelectedKey] = useState<string>(todayKey);

  // Modal de criação de evento
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState(todayKey);
  const [startTime, setStartTime] = useState("");
  const [category, setCategory] = useState("EVENTO");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CorporateEventItem[]>();
    for (const ev of events) {
      const key = eventDateKey(ev.eventDate);
      const list = map.get(key) || [];
      list.push(ev);
      map.set(key, list);
    }
    return map;
  }, [events]);

  const selectedDayEvents = eventsByDay.get(selectedKey) || [];

  const upcomingEvents = useMemo(() => {
    return events
      .filter((ev) => eventDateKey(ev.eventDate) >= todayKey)
      .slice(0, compact ? 3 : 5);
  }, [events, todayKey, compact]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDayIndex; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);

  const openCreateModal = (dateToUse?: string) => {
    setTitle("");
    setEventDate(dateToUse || selectedKey || todayKey);
    setStartTime("");
    setCategory("EVENTO");
    setDescription("");
    setError(null);
    setIsModalOpen(true);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Informe o título do evento.");
      return;
    }

    if (!eventDate) {
      setError("Selecione a data do evento.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/calendario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          eventDate,
          startTime: startTime || null,
          category,
          description: description.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || "Erro ao registrar evento.");
        return;
      }

      setSelectedKey(eventDate);
      const [y, m] = eventDate.split("-").map(Number);
      if (y && m) {
        setViewDate(new Date(y, m - 1, 1));
      }
      setIsModalOpen(false);
      await onRefresh();
    } catch {
      setError("Erro de conexão ao registrar evento.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/calendario/${id}`, { method: "DELETE" });
      if (res.ok) {
        await onRefresh();
      }
    } catch (err) {
      console.error("Erro ao excluir evento:", err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-stone-100 shadow-md p-6 flex flex-col gap-5">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-3 border-b border-stone-100 pb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl shrink-0">
            <CalendarDays size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-stone-800 truncate">
              Calendário Corporativo
            </h2>
            <p className="text-[11px] text-stone-400 truncate">
              Eventos e datas importantes da empresa
            </p>
          </div>
        </div>

        {isHost && (
          <button
            type="button"
            onClick={() => openCreateModal()}
            className="flex items-center gap-1.5 bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Plus size={14} strokeWidth={2.5} />
            Evento
          </button>
        )}
      </div>

      {/* Navegação do Mês */}
      <div className="flex items-center justify-between bg-stone-50 border border-stone-200/70 rounded-2xl p-1.5">
        <button
          type="button"
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          className="p-1.5 hover:bg-white rounded-xl text-stone-600 transition-colors cursor-pointer"
          aria-label="Mês anterior"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-stone-700 capitalize select-none">
            {viewDate.toLocaleDateString("pt-BR", {
              month: "long",
              year: "numeric",
            })}
          </span>
          <button
            type="button"
            onClick={() => {
              const now = new Date();
              setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
              setSelectedKey(todayKey);
            }}
            className="text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
          >
            Hoje
          </button>
        </div>

        <button
          type="button"
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          className="p-1.5 hover:bg-white rounded-xl text-stone-600 transition-colors cursor-pointer"
          aria-label="Próximo mês"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Mini Grade Mensal */}
      <div>
        <div className="grid grid-cols-7 gap-1 mb-1.5">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="text-center text-[10px] font-bold text-stone-400 uppercase py-1 select-none"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {calendarCells.map((dayNum, idx) => {
            if (!dayNum) {
              return <div key={`empty-${idx}`} className="h-9" />;
            }

            const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
            const dayEvents = eventsByDay.get(key) || [];
            const isSelected = key === selectedKey;
            const isToday = key === todayKey;

            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedKey(key)}
                className={`h-9 rounded-xl flex flex-col items-center justify-center relative text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#3B82F6] text-white shadow-sm"
                    : isToday
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : dayEvents.length > 0
                    ? "bg-stone-50 text-stone-800 hover:bg-stone-100 border border-stone-200/70"
                    : "text-stone-600 hover:bg-stone-50"
                }`}
              >
                <span className="leading-none">{dayNum}</span>
                {dayEvents.length > 0 && (
                  <div className="flex items-center gap-0.5 mt-1">
                    {dayEvents.slice(0, 3).map((ev) => {
                      const meta = CATEGORY_META[ev.category] || CATEGORY_META.EVENTO;
                      return (
                        <span
                          key={ev.id}
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSelected ? "bg-white" : meta.dot
                          }`}
                        />
                      );
                    })}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Eventos do Dia Selecionado */}
      <div className="border-t border-stone-100 pt-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
            Dia {formatDateBr(selectedKey)}
          </span>
          {isHost && (
            <button
              type="button"
              onClick={() => openCreateModal(selectedKey)}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              + Adicionar neste dia
            </button>
          )}
        </div>

        {selectedDayEvents.length === 0 ? (
          <p className="text-xs text-stone-400 italic bg-stone-50/70 rounded-xl p-3 text-center">
            Nenhum evento registrado nesta data.
          </p>
        ) : (
          <div className="space-y-2">
            {selectedDayEvents.map((ev) => {
              const meta = CATEGORY_META[ev.category] || CATEGORY_META.EVENTO;
              return (
                <div
                  key={ev.id}
                  className="p-3 rounded-2xl bg-stone-50/70 border border-stone-100 flex items-start justify-between gap-2.5"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md border ${meta.badge}`}
                      >
                        {meta.label}
                      </span>
                      {ev.startTime && (
                        <span className="text-[11px] font-semibold text-stone-500 flex items-center gap-1">
                          <Clock size={11} />
                          {ev.startTime}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-stone-800 break-words">
                      {ev.title}
                    </p>
                    {ev.description && (
                      <p className="text-[11px] text-stone-500 leading-relaxed break-words">
                        {ev.description}
                      </p>
                    )}
                  </div>

                  {isHost && (
                    <button
                      type="button"
                      onClick={() => handleDeleteEvent(ev.id)}
                      disabled={deletingId === ev.id}
                      className="text-stone-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                      title="Excluir evento"
                    >
                      {deletingId === ev.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Próximos Eventos */}
      <div className="border-t border-stone-100 pt-4 space-y-2.5">
        <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
          Próximos Eventos
        </span>
        {upcomingEvents.length === 0 ? (
          <p className="text-xs text-stone-400 italic">
            Nenhum evento futuro agendado.
          </p>
        ) : (
          <div className="space-y-2">
            {upcomingEvents.map((ev) => {
              const key = eventDateKey(ev.eventDate);
              const meta = CATEGORY_META[ev.category] || CATEGORY_META.EVENTO;
              return (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => {
                    setSelectedKey(key);
                    const [y, m] = key.split("-").map(Number);
                    if (y && m) setViewDate(new Date(y, m - 1, 1));
                  }}
                  className="w-full text-left flex items-center justify-between gap-2 p-2.5 rounded-xl hover:bg-stone-50 border border-stone-100 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${meta.dot}`} />
                    <span className="text-xs font-semibold text-stone-700 truncate">
                      {ev.title}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-stone-400 shrink-0 tabular-nums">
                    {formatDateBr(key).slice(0, 5)}
                    {ev.startTime ? ` • ${ev.startTime}` : ""}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Novo Evento */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Registrar Evento Corporativo"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateEvent} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-stone-600 uppercase tracking-wider">
              Título do Evento *
            </label>
            <InputField
              type="text"
              placeholder="Ex: Reunião Geral, Treinamento, Confraternização"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              classNameInput="text-sm text-stone-700"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-stone-600 uppercase tracking-wider">
                Data *
              </label>
              <InputField
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                required
                classNameInput="text-sm text-stone-700"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-stone-600 uppercase tracking-wider">
                Horário (opcional)
              </label>
              <InputField
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                classNameInput="text-sm text-stone-700"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-stone-600 uppercase tracking-wider">
              Categoria
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(CATEGORY_META).map(([key, meta]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategory(key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    category === key
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                  {meta.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-stone-600 uppercase tracking-wider">
              Descrição (opcional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes breves, local ou link do evento..."
              className="w-full px-3.5 py-2.5 border border-stone-400/50 rounded-xl text-sm text-stone-700 outline-none focus:border-blue-500 resize-none"
            />
          </div>

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
                text={submitting ? "Salvando..." : "Salvar Evento"}
                disabled={submitting}
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
