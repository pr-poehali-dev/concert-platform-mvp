import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { ADMIN_URL, type AdminUser, formatDate } from "./types";

interface ProjectRow {
  id: string; title: string; artist: string; status: string;
  city: string; dateStart: string;
  incomePlan: number; incomeFact: number;
  expensesPlan: number; expensesFact: number;
  createdAt: string;
}
interface EmployeeRow { id: string; name: string; email: string; roleInCompany: string; isActive: boolean; createdAt: string; }
interface VenueRow { id: string; name: string; city: string; venueType: string; capacity: number; priceFrom: number; verified: boolean; rating: number; }
interface BookingRow { id: string; status: string; venueName: string; eventDate: string; rentalAmount: number | null; }
interface Finance { totalIncomePlan: number; totalIncomeFact: number; totalExpensesPlan: number; totalExpensesFact: number; totalProfitFact: number; }

interface UserDetails {
  user: AdminUser & { phone: string; legalName: string; inn: string; companyType: string };
  projects: ProjectRow[];
  projectsCount: number;
  employees: EmployeeRow[];
  employeesCount: number;
  venues: VenueRow[];
  bookings: BookingRow[];
  finance: Finance;
}

const PROJECT_STATUS: Record<string, { label: string; cls: string }> = {
  planning:   { label: "Планирование", cls: "bg-white/10 text-white/50 border-white/10" },
  in_progress:{ label: "В работе",     cls: "bg-neon-cyan/15 text-neon-cyan border-neon-cyan/25" },
  completed:  { label: "Завершён",     cls: "bg-neon-green/15 text-neon-green border-neon-green/25" },
  cancelled:  { label: "Отменён",      cls: "bg-neon-pink/15 text-neon-pink border-neon-pink/25" },
};

const BOOKING_STATUS: Record<string, { label: string; cls: string }> = {
  pending:   { label: "Ожидает",    cls: "bg-white/10 text-white/50 border-white/10" },
  confirmed: { label: "Подтверждено", cls: "bg-neon-cyan/15 text-neon-cyan border-neon-cyan/25" },
  accepted:  { label: "Принято",    cls: "bg-neon-green/15 text-neon-green border-neon-green/25" },
  rejected:  { label: "Отклонено", cls: "bg-neon-pink/15 text-neon-pink border-neon-pink/25" },
  cancelled: { label: "Отменено",   cls: "bg-white/10 text-white/40 border-white/10" },
};

const fmt = (n: number) => n.toLocaleString("ru-RU") + " ₽";

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="glass rounded-xl p-4 flex flex-col gap-1">
      <span className="text-white/40 text-xs">{label}</span>
      <span className={`font-oswald font-bold text-lg ${color}`}>{value}</span>
    </div>
  );
}

interface Props {
  user: AdminUser;
  token: string;
  onClose: () => void;
}

export default function UserDetailsModal({ user: userRow, token, onClose }: Props) {
  const [data, setData] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "projects" | "employees" | "venues">("overview");

  useEffect(() => {
    setLoading(true);
    fetch(`${ADMIN_URL}?action=user_details&id=${userRow.id}`, {
      headers: { "X-Admin-Token": token },
    })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [userRow.id, token]);

  const isOrganizer = userRow.role === "organizer";

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-3xl glass-strong rounded-2xl border border-white/10 animate-scale-in flex flex-col max-h-[90vh]">

        {/* Шапка */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${userRow.avatarColor} flex items-center justify-center font-oswald font-bold text-white text-lg shrink-0`}>
              {userRow.avatar || userRow.name[0]?.toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-oswald font-bold text-white text-lg">{userRow.name}</span>
                {userRow.isAdmin && <Icon name="ShieldCheck" size={15} className="text-neon-purple" />}
                {userRow.verified && <Icon name="BadgeCheck" size={15} className="text-neon-green" />}
              </div>
              <div className="flex items-center gap-3 text-xs text-white/40 mt-0.5">
                <span>{userRow.email}</span>
                {userRow.city && <span>· {userRow.city}</span>}
                <span>· с {formatDate(userRow.createdAt)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={isOrganizer ? "bg-neon-purple/20 text-neon-purple border-neon-purple/30" : "bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30"}>
              {isOrganizer ? "Организатор" : "Площадка"}
            </Badge>
            <button onClick={onClose} className="text-white/30 hover:text-white transition-colors p-1">
              <Icon name="X" size={18} />
            </button>
          </div>
        </div>

        {/* Табы */}
        <div className="flex gap-1 px-6 pt-4 shrink-0">
          {[
            { id: "overview", label: "Обзор", icon: "LayoutDashboard" },
            ...(isOrganizer ? [{ id: "projects", label: `Проекты${data ? ` (${data.projectsCount})` : ""}`, icon: "FolderOpen" }] : []),
            { id: "employees", label: `Сотрудники${data ? ` (${data.employeesCount})` : ""}`, icon: "Users" },
            ...(!isOrganizer ? [{ id: "venues", label: `Площадки${data ? ` (${data.venues.length})` : ""}`, icon: "Building2" }] : []),
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-all ${tab === t.id ? "bg-neon-purple/20 text-neon-purple border border-neon-purple/30" : "text-white/40 hover:text-white"}`}>
              <Icon name={t.icon} size={14} />{t.label}
            </button>
          ))}
        </div>

        {/* Контент */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {loading ? (
            <div className="space-y-3">
              {[1,2,3,4].map(i => <div key={i} className="h-16 glass rounded-xl animate-pulse" />)}
            </div>
          ) : !data ? (
            <div className="text-center py-12 text-white/30">Не удалось загрузить данные</div>
          ) : (

            /* ── Обзор ── */
            tab === "overview" ? (
              <div className="space-y-5">
                {/* Контактная информация */}
                <div>
                  <p className="text-xs text-white/30 uppercase tracking-wider mb-3">Контакты и реквизиты</p>
                  <div className="glass rounded-xl p-4 grid grid-cols-2 gap-3 text-sm">
                    {[
                      ["Email", data.user.email],
                      ["Телефон", data.user.phone || "—"],
                      ["Город", data.user.city || "—"],
                      ["Юр. название", data.user.legalName || "—"],
                      ["ИНН", data.user.inn || "—"],
                      ["Тип компании", { individual: "Физлицо", ip: "ИП", ooo: "ООО", other: "Другое" }[data.user.companyType] || "—"],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <span className="text-white/35 text-xs block">{label}</span>
                        <span className="text-white/80 text-sm">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Финансовые метрики — только для организатора */}
                {isOrganizer && (
                  <div>
                    <p className="text-xs text-white/30 uppercase tracking-wider mb-3">Финансы по всем проектам</p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <StatCard label="Доход (факт)" value={fmt(data.finance.totalIncomeFact)} color="text-neon-green" />
                      <StatCard label="Доход (план)" value={fmt(data.finance.totalIncomePlan)} color="text-white/70" />
                      <StatCard label="Расходы (факт)" value={fmt(data.finance.totalExpensesFact)} color="text-neon-pink" />
                      <StatCard label="Расходы (план)" value={fmt(data.finance.totalExpensesPlan)} color="text-white/70" />
                      <StatCard
                        label="Прибыль (факт)"
                        value={fmt(data.finance.totalProfitFact)}
                        color={data.finance.totalProfitFact >= 0 ? "text-neon-cyan" : "text-neon-pink"}
                      />
                      <StatCard label="Проектов" value={String(data.projectsCount)} color="text-neon-purple" />
                    </div>
                  </div>
                )}

                {/* Краткий список последних проектов */}
                {isOrganizer && data.projects.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-white/30 uppercase tracking-wider">Последние проекты</p>
                      <button onClick={() => setTab("projects")} className="text-xs text-neon-purple hover:text-neon-purple/80 transition-colors">Все →</button>
                    </div>
                    <div className="space-y-2">
                      {data.projects.slice(0, 3).map(p => {
                        const st = PROJECT_STATUS[p.status] || { label: p.status, cls: "bg-white/10 text-white/40 border-white/10" };
                        return (
                          <div key={p.id} className="glass rounded-xl p-3 flex items-center justify-between gap-3">
                            <div>
                              <span className="text-white text-sm font-medium">{p.title}</span>
                              {p.artist && <span className="text-white/40 text-xs ml-2">{p.artist}</span>}
                              {p.city && <span className="text-white/30 text-xs ml-2">· {p.city}</span>}
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-neon-green text-xs font-medium">{fmt(p.incomeFact)}</span>
                              <Badge className={`text-xs border ${st.cls}`}>{st.label}</Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Сотрудники краткие */}
                {data.employees.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-white/30 uppercase tracking-wider">Сотрудники</p>
                      <button onClick={() => setTab("employees")} className="text-xs text-neon-purple hover:text-neon-purple/80 transition-colors">Все →</button>
                    </div>
                    <div className="glass rounded-xl p-3 flex flex-wrap gap-2">
                      {data.employees.slice(0, 5).map(e => (
                        <div key={e.id} className="flex items-center gap-2 glass rounded-lg px-3 py-1.5">
                          <div className="w-6 h-6 rounded-md bg-neon-purple/20 flex items-center justify-center text-neon-purple text-xs font-bold shrink-0">
                            {e.name[0]?.toUpperCase()}
                          </div>
                          <div>
                            <span className="text-white text-xs font-medium">{e.name}</span>
                            <span className="text-white/35 text-xs ml-1.5">{e.roleInCompany}</span>
                          </div>
                          {!e.isActive && <span className="text-[10px] text-neon-pink">неакт.</span>}
                        </div>
                      ))}
                      {data.employees.length > 5 && <span className="text-white/30 text-xs self-center">+{data.employees.length - 5}</span>}
                    </div>
                  </div>
                )}

                {/* Площадки краткие (для venue) */}
                {!isOrganizer && data.venues.length > 0 && (
                  <div>
                    <p className="text-xs text-white/30 uppercase tracking-wider mb-3">Площадки</p>
                    <div className="space-y-2">
                      {data.venues.map(v => (
                        <div key={v.id} className="glass rounded-xl p-3 flex items-center justify-between">
                          <div>
                            <span className="text-white text-sm font-medium">{v.name}</span>
                            <span className="text-white/40 text-xs ml-2">{v.city} · {v.venueType} · {v.capacity.toLocaleString()} чел.</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {v.rating > 0 && <span className="text-white/50 text-xs">★ {v.rating.toFixed(1)}</span>}
                            {v.verified ? <Icon name="BadgeCheck" size={15} className="text-neon-green" /> : <Icon name="BadgeX" size={15} className="text-white/20" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Бронирования краткие (как организатор) */}
                {data.bookings.length > 0 && (
                  <div>
                    <p className="text-xs text-white/30 uppercase tracking-wider mb-3">Последние бронирования</p>
                    <div className="space-y-2">
                      {data.bookings.slice(0, 4).map(b => {
                        const bs = BOOKING_STATUS[b.status] || { label: b.status, cls: "bg-white/10 text-white/40 border-white/10" };
                        return (
                          <div key={b.id} className="glass rounded-xl p-3 flex items-center justify-between">
                            <div>
                              <span className="text-white/80 text-sm">{b.venueName}</span>
                              {b.eventDate && <span className="text-white/35 text-xs ml-2">{b.eventDate}</span>}
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              {b.rentalAmount !== null && <span className="text-white/50 text-xs">{fmt(b.rentalAmount)}</span>}
                              <Badge className={`text-xs border ${bs.cls}`}>{bs.label}</Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )

            /* ── Проекты ── */
            : tab === "projects" ? (
              <div className="space-y-3">
                {data.projects.length === 0 ? (
                  <div className="text-center py-10 text-white/30">
                    <Icon name="FolderOpen" size={32} className="mx-auto mb-2 opacity-30" />
                    Проектов нет
                  </div>
                ) : data.projects.map(p => {
                  const st = PROJECT_STATUS[p.status] || { label: p.status, cls: "bg-white/10 text-white/40 border-white/10" };
                  const profit = p.incomeFact - p.expensesFact;
                  return (
                    <div key={p.id} className="glass rounded-xl p-4 border border-white/8">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">{p.title}</span>
                            <Badge className={`text-xs border ${st.cls}`}>{st.label}</Badge>
                          </div>
                          <div className="text-white/35 text-xs mt-0.5 flex items-center gap-2">
                            {p.artist && <span>{p.artist}</span>}
                            {p.city && <span>· {p.city}</span>}
                            {p.dateStart && <span>· {p.dateStart}</span>}
                          </div>
                        </div>
                        <span className={`text-sm font-oswald font-bold shrink-0 ${profit >= 0 ? "text-neon-green" : "text-neon-pink"}`}>
                          {profit >= 0 ? "+" : ""}{fmt(profit)}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        {[
                          ["Доход план", fmt(p.incomePlan), "text-white/50"],
                          ["Доход факт", fmt(p.incomeFact), "text-neon-green"],
                          ["Расх. план", fmt(p.expensesPlan), "text-white/50"],
                          ["Расх. факт", fmt(p.expensesFact), "text-neon-pink"],
                        ].map(([lbl, val, cls]) => (
                          <div key={lbl} className="glass rounded-lg p-2 text-center">
                            <div className="text-white/30 text-[10px] mb-0.5">{lbl}</div>
                            <div className={`font-medium ${cls}`}>{val}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )

            /* ── Сотрудники ── */
            : tab === "employees" ? (
              <div className="space-y-2">
                {data.employees.length === 0 ? (
                  <div className="text-center py-10 text-white/30">
                    <Icon name="Users" size={32} className="mx-auto mb-2 opacity-30" />
                    Сотрудников нет
                  </div>
                ) : data.employees.map(e => (
                  <div key={e.id} className="glass rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center font-bold text-white text-sm shrink-0">
                        {e.name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white text-sm font-medium">{e.name}</span>
                          {!e.isActive && <span className="text-[10px] px-1.5 py-0.5 bg-neon-pink/10 text-neon-pink border border-neon-pink/20 rounded">Неактивен</span>}
                        </div>
                        <div className="text-white/35 text-xs">{e.email} · {e.roleInCompany}</div>
                      </div>
                    </div>
                    <span className="text-white/25 text-xs">{formatDate(e.createdAt)}</span>
                  </div>
                ))}
              </div>
            )

            /* ── Площадки ── */
            : (
              <div className="space-y-2">
                {data.venues.length === 0 ? (
                  <div className="text-center py-10 text-white/30">
                    <Icon name="Building2" size={32} className="mx-auto mb-2 opacity-30" />
                    Площадок нет
                  </div>
                ) : data.venues.map(v => (
                  <div key={v.id} className="glass rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{v.name}</span>
                        {v.verified ? <Icon name="BadgeCheck" size={14} className="text-neon-green" /> : <Icon name="BadgeX" size={14} className="text-white/20" />}
                      </div>
                      <div className="text-white/35 text-xs mt-0.5">{v.city} · {v.venueType} · вместимость {v.capacity.toLocaleString()}</div>
                    </div>
                    <div className="text-right shrink-0">
                      {v.rating > 0 && <div className="text-white/60 text-sm">★ {v.rating.toFixed(1)}</div>}
                      <div className="text-white/35 text-xs">от {v.priceFrom.toLocaleString()} ₽</div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
