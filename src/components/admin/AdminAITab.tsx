import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { ADMIN_URL } from "./types";

const AI_URL = "https://functions.poehali.dev/8841fd93-d5cc-414b-a912-d185ca8cab48";

interface AIRequest {
  id: number;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  question: string;
  answer: string;
  isHelpful: boolean | null;
  createdAt: string;
}

interface AIStats {
  total: number;
  helpful: number;
  notHelpful: number;
  week: number;
}

interface Props {
  token: string;
}

function formatDate(str: string) {
  const d = new Date(str);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return "только что";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} мин назад`;
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("ru", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function AdminAITab({ token }: Props) {
  const [requests, setRequests] = useState<AIRequest[]>([]);
  const [stats, setStats] = useState<AIStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);

  const apiFetch = (path: string) =>
    fetch(`${AI_URL}${path}`, { headers: { "X-Admin-Token": token } });

  const load = async (p = 1, s = "") => {
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        apiFetch(`?action=list&page=${p}&limit=20${s ? `&search=${encodeURIComponent(s)}` : ""}`),
        apiFetch("?action=stats"),
      ]);
      const listData = await listRes.json();
      const statsData = await statsRes.json();
      if (listRes.ok) {
        setRequests(listData.requests || []);
        setPages(listData.pages || 1);
        setTotal(listData.total || 0);
        setPage(p);
      }
      if (statsRes.ok) setStats(statsData);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load(1, search);
  };

  const roleLabel = (role: string) =>
    role === "organizer" ? "Организатор" : role === "venue" ? "Площадка" : role;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Всего запросов", value: stats.total, icon: "MessageSquare", color: "text-neon-cyan" },
            { label: "За неделю", value: stats.week, icon: "TrendingUp", color: "text-neon-purple" },
            { label: "Полезных ответов", value: stats.helpful, icon: "ThumbsUp", color: "text-neon-green" },
            { label: "Не помогло", value: stats.notHelpful, icon: "ThumbsDown", color: "text-neon-pink" },
          ].map(s => (
            <div key={s.label} className="glass rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon name={s.icon as never} size={16} className={s.color} />
                <span className="text-white/50 text-xs">{s.label}</span>
              </div>
              <p className={`text-2xl font-bold font-oswald ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="flex-1 relative">
          <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по имени, email или тексту вопроса..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-neon-purple/50"
          />
        </div>
        <button type="submit" className="px-4 py-2 bg-neon-purple/20 border border-neon-purple/30 rounded-xl text-neon-purple text-sm hover:bg-neon-purple/30 transition-colors">
          Найти
        </button>
        {search && (
          <button type="button" onClick={() => { setSearch(""); load(1, ""); }}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white/50 text-sm hover:bg-white/10 transition-colors">
            <Icon name="X" size={14} />
          </button>
        )}
      </form>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <Icon name="Sparkles" size={15} className="text-neon-purple" />
            Запросы к ИИ-ассистенту
          </h3>
          <span className="text-white/40 text-xs">{total} всего</span>
        </div>

        {loading ? (
          <div className="p-8 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-neon-purple/30 border-t-neon-purple rounded-full animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center">
            <Icon name="MessageSquare" size={32} className="text-white/20 mx-auto mb-3" />
            <p className="text-white/40 text-sm">Пока нет запросов</p>
          </div>
        ) : (
          <div className="divide-y divide-white/6">
            {requests.map(req => (
              <div key={req.id} className="px-4 py-3">
                {/* Row header */}
                <div
                  className="flex items-start gap-3 cursor-pointer"
                  onClick={() => setExpanded(expanded === req.id ? null : req.id)}
                >
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-neon-purple/30 to-neon-cyan/20 flex items-center justify-center shrink-0 text-xs font-bold text-white/70">
                    {req.userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white text-sm font-medium">{req.userName}</span>
                      <span className="text-white/30 text-xs">{req.userEmail}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded-md bg-white/8 text-white/50">{roleLabel(req.userRole)}</span>
                      {req.isHelpful === true && <span className="text-xs text-neon-green flex items-center gap-0.5"><Icon name="ThumbsUp" size={11} />Помогло</span>}
                      {req.isHelpful === false && <span className="text-xs text-neon-pink flex items-center gap-0.5"><Icon name="ThumbsDown" size={11} />Не помогло</span>}
                    </div>
                    <p className="text-white/60 text-xs mt-0.5 truncate">{req.question}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-white/30 text-xs">{formatDate(req.createdAt)}</span>
                    <Icon name={expanded === req.id ? "ChevronUp" : "ChevronDown"} size={14} className="text-white/30" />
                  </div>
                </div>

                {/* Expanded */}
                {expanded === req.id && (
                  <div className="mt-3 ml-11 space-y-3">
                    <div className="bg-white/5 rounded-xl p-3 border border-white/6">
                      <p className="text-white/40 text-xs mb-1 uppercase tracking-wide">Вопрос</p>
                      <p className="text-white/80 text-sm">{req.question}</p>
                    </div>
                    <div className="bg-neon-purple/5 rounded-xl p-3 border border-neon-purple/10">
                      <p className="text-white/40 text-xs mb-1 uppercase tracking-wide flex items-center gap-1">
                        <Icon name="Sparkles" size={10} className="text-neon-purple" /> Ответ ИИ
                      </p>
                      <p className="text-white/80 text-sm whitespace-pre-wrap">{req.answer}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-white/8">
            <button
              onClick={() => load(page - 1, search)}
              disabled={page <= 1}
              className="p-1.5 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Icon name="ChevronLeft" size={15} />
            </button>
            <span className="text-white/50 text-xs px-2">
              {page} / {pages}
            </span>
            <button
              onClick={() => load(page + 1, search)}
              disabled={page >= pages}
              className="p-1.5 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Icon name="ChevronRight" size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}