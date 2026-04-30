import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { type Employee, type AccessPermissions, DEFAULT_ACCESS_PERMISSIONS, ROLE_LABELS, EMPLOYEES_URL } from "./types";

interface EditForm { name: string; email: string; roleInCompany: string }

interface Props {
  userId: string;
  employees: Employee[];
  empLoading: boolean;
  onReload: () => void;
}

interface PermToggleProps {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
  icon: string;
  color: string;
}

function PermToggle({ label, description, value, onChange, icon, color }: PermToggleProps) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-xl border transition-all ${value ? "bg-white/5 border-white/10" : "bg-black/20 border-white/5 opacity-60"}`}>
      <div className="flex items-center gap-2.5">
        <Icon name={icon} size={14} className={value ? color : "text-white/25"} />
        <div>
          <p className="text-white/80 text-xs font-medium">{label}</p>
          <p className="text-white/60 text-[10px]">{description}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`w-9 h-5 rounded-full transition-all relative shrink-0 ${value ? "bg-neon-purple" : "bg-white/15"}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${value ? "left-4" : "left-0.5"}`} />
      </button>
    </div>
  );
}

export default function EmployeesSection({ userId, employees, empLoading, onReload }: Props) {
  const [showAddEmp, setShowAddEmp] = useState(false);
  const [empForm, setEmpForm] = useState({ name: "", email: "", password: "", roleInCompany: "employee" });
  const [perms, setPerms] = useState<AccessPermissions>({ ...DEFAULT_ACCESS_PERMISSIONS });
  const [empError, setEmpError] = useState("");
  const [empSaving, setEmpSaving] = useState(false);

  // Редактирование прав сотрудника
  const [editPermId, setEditPermId] = useState<string | null>(null);
  const [editPerms, setEditPerms] = useState<AccessPermissions>({ ...DEFAULT_ACCESS_PERMISSIONS });
  const [savingPerms, setSavingPerms] = useState(false);

  // Редактирование профиля сотрудника (имя, email, роль)
  const [editProfileId, setEditProfileId] = useState<string | null>(null);
  const [editProfile, setEditProfile] = useState<EditForm>({ name: "", email: "", roleInCompany: "employee" });
  const [profileError, setProfileError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Удаление сотрудника
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openEditPerms = (emp: Employee) => {
    setEditPermId(emp.id);
    setEditPerms({ ...emp.accessPermissions });
  };

  const openEditProfile = (emp: Employee) => {
    setEditProfileId(emp.id);
    setEditProfile({ name: emp.name, email: emp.email, roleInCompany: emp.roleInCompany });
    setProfileError("");
  };

  const saveProfile = async () => {
    if (!editProfileId) return;
    setProfileError("");
    if (!editProfile.name.trim()) { setProfileError("Введите имя"); return; }
    if (!editProfile.email.includes("@")) { setProfileError("Некорректный email"); return; }
    setSavingProfile(true);
    try {
      const res = await fetch(`${EMPLOYEES_URL}?action=update`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editProfileId,
          name: editProfile.name.trim(),
          email: editProfile.email.trim().toLowerCase(),
          roleInCompany: editProfile.roleInCompany,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setProfileError(data.error || "Ошибка"); return; }
      setEditProfileId(null);
      onReload();
    } catch (e) {
      setProfileError("Сеть недоступна");
    } finally {
      setSavingProfile(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await fetch(`${EMPLOYEES_URL}?action=delete`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteId }),
      });
      setDeleteId(null);
      onReload();
    } finally {
      setDeleting(false);
    }
  };

  const savePermissions = async () => {
    if (!editPermId) return;
    setSavingPerms(true);
    await fetch(`${EMPLOYEES_URL}?action=update_permissions`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editPermId, accessPermissions: editPerms }),
    });
    setSavingPerms(false);
    setEditPermId(null);
    onReload();
  };

  const addEmployee = async () => {
    setEmpError("");
    if (!empForm.name.trim()) return setEmpError("Введите имя");
    if (!empForm.email.includes("@")) return setEmpError("Некорректный email");
    if (empForm.password.length < 6) return setEmpError("Пароль минимум 6 символов");
    setEmpSaving(true);
    const res = await fetch(`${EMPLOYEES_URL}?action=add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyUserId: userId, ...empForm, accessPermissions: perms }),
    });
    const data = await res.json();
    setEmpSaving(false);
    if (!res.ok) { setEmpError(data.error || "Ошибка"); return; }
    setEmpForm({ name: "", email: "", password: "", roleInCompany: "employee" });
    setPerms({ ...DEFAULT_ACCESS_PERMISSIONS });
    setShowAddEmp(false);
    onReload();
  };

  const toggleEmployee = async (emp: Employee) => {
    const action = emp.isActive ? "deactivate" : "activate";
    await fetch(`${EMPLOYEES_URL}?action=${action}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: emp.id }),
    });
    onReload();
  };

  const PERM_ITEMS: { key: keyof AccessPermissions; label: string; description: string; icon: string; color: string }[] = [
    { key: "canViewExpenses", label: "Видит расходы",  description: "Вкладка «Бюджет расходов»", icon: "TrendingDown", color: "text-neon-pink" },
    { key: "canViewIncome",   label: "Видит доходы",   description: "Вкладка «Доходы»",           icon: "TrendingUp",   color: "text-neon-green" },
    { key: "canViewSummary",  label: "Видит P&L",      description: "Итоговый отчёт прибыли",     icon: "BarChart3",    color: "text-neon-cyan" },
    { key: "canEditExpenses", label: "Редактирует расходы", description: "Добавлять/изменять/удалять", icon: "Pencil", color: "text-neon-pink" },
    { key: "canEditIncome",   label: "Редактирует доходы",  description: "Добавлять/изменять/удалять", icon: "Pencil", color: "text-neon-green" },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-oswald font-semibold text-white text-lg">Сотрудники компании</h3>
          <p className="text-white/65 text-xs mt-0.5">Сотрудники могут входить в личный кабинет и работать от имени компании</p>
        </div>
        <button onClick={() => setShowAddEmp(true)}
          className="flex items-center gap-2 px-4 py-2 bg-neon-purple text-white rounded-xl text-sm hover:opacity-90 transition-opacity font-oswald font-medium">
          <Icon name="UserPlus" size={15} />Добавить
        </button>
      </div>

      {/* Форма добавления */}
      {showAddEmp && (
        <div className="glass rounded-2xl p-5 border border-neon-purple/20 space-y-4">
          <h4 className="font-oswald font-semibold text-white text-sm">Новый сотрудник</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/65 mb-1 block">Имя</label>
              <input value={empForm.name} onChange={e => setEmpForm(f => ({ ...f, name: e.target.value }))} placeholder="Иван Иванов"
                className="w-full glass rounded-xl px-3 py-2.5 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-purple/50 text-sm" />
            </div>
            <div>
              <label className="text-xs text-white/65 mb-1 block">Email</label>
              <input type="email" value={empForm.email} onChange={e => setEmpForm(f => ({ ...f, email: e.target.value }))} placeholder="emp@company.ru"
                className="w-full glass rounded-xl px-3 py-2.5 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-purple/50 text-sm" />
            </div>
            <div>
              <label className="text-xs text-white/65 mb-1 block">Пароль</label>
              <input type="password" value={empForm.password} onChange={e => setEmpForm(f => ({ ...f, password: e.target.value }))} placeholder="Минимум 6 символов"
                className="w-full glass rounded-xl px-3 py-2.5 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-purple/50 text-sm" />
            </div>
            <div>
              <label className="text-xs text-white/65 mb-1 block">Роль</label>
              <select value={empForm.roleInCompany} onChange={e => setEmpForm(f => ({ ...f, roleInCompany: e.target.value }))}
                className="w-full glass rounded-xl px-3 py-2.5 text-white outline-none border border-white/10 text-sm appearance-none bg-transparent">
                {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v} className="bg-gray-900">{l}</option>)}
              </select>
            </div>
          </div>

          {/* Настройка доступа */}
          <div>
            <p className="text-xs text-white/65 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Icon name="ShieldCheck" size={12} className="text-neon-purple" />
              Доступ к финансовой информации
            </p>
            <div className="space-y-1.5">
              {PERM_ITEMS.map(item => (
                <PermToggle
                  key={item.key}
                  label={item.label}
                  description={item.description}
                  icon={item.icon}
                  color={item.color}
                  value={perms[item.key]}
                  onChange={v => setPerms(p => ({ ...p, [item.key]: v }))}
                />
              ))}
            </div>
          </div>

          {empError && <p className="text-neon-pink text-xs flex items-center gap-1"><Icon name="AlertCircle" size={12} />{empError}</p>}
          <div className="flex gap-2">
            <button onClick={() => { setShowAddEmp(false); setEmpError(""); setPerms({ ...DEFAULT_ACCESS_PERMISSIONS }); }}
              className="flex-1 py-2 glass text-white/70 rounded-xl border border-white/10 text-sm hover:text-white">Отмена</button>
            <button onClick={addEmployee} disabled={empSaving}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-neon-purple text-white rounded-xl text-sm hover:opacity-90 disabled:opacity-50">
              {empSaving ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="UserPlus" size={14} />}Добавить
            </button>
          </div>
        </div>
      )}

      {/* Модалка редактирования прав */}
      {editPermId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setEditPermId(null)} />
          <div className="relative z-10 w-full max-w-sm glass-strong rounded-2xl p-6 border border-neon-purple/20 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-oswald font-bold text-white flex items-center gap-2">
                <Icon name="ShieldCheck" size={16} className="text-neon-purple" />
                Права доступа
              </h4>
              <button onClick={() => setEditPermId(null)} className="text-white/55 hover:text-white transition-colors">
                <Icon name="X" size={16} />
              </button>
            </div>
            <p className="text-white/65 text-xs mb-4">
              Сотрудник: <span className="text-white/70">{employees.find(e => e.id === editPermId)?.name}</span>
            </p>
            <div className="space-y-1.5 mb-5">
              {PERM_ITEMS.map(item => (
                <PermToggle
                  key={item.key}
                  label={item.label}
                  description={item.description}
                  icon={item.icon}
                  color={item.color}
                  value={editPerms[item.key]}
                  onChange={v => setEditPerms(p => ({ ...p, [item.key]: v }))}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditPermId(null)}
                className="flex-1 py-2.5 glass text-white/70 rounded-xl border border-white/10 text-sm hover:text-white transition-colors">
                Отмена
              </button>
              <button onClick={savePermissions} disabled={savingPerms}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-neon-purple text-white rounded-xl text-sm font-oswald font-semibold hover:opacity-90 disabled:opacity-50">
                {savingPerms ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Check" size={14} />}Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Список сотрудников */}
      {empLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="glass rounded-2xl h-16 animate-pulse" />)}</div>
      ) : employees.length === 0 ? (
        <div className="text-center py-12 glass rounded-2xl">
          <Icon name="Users" size={36} className="text-white/20 mx-auto mb-3" />
          <p className="text-white/65 text-sm">Нет сотрудников</p>
          <p className="text-white/25 text-xs mt-1">Добавьте первого сотрудника</p>
        </div>
      ) : (
        <div className="space-y-2">
          {employees.map(emp => {
            const p = emp.accessPermissions || DEFAULT_ACCESS_PERMISSIONS;
            const deniedCount = Object.values(p).filter(v => !v).length;
            return (
              <div key={emp.id} className={`glass rounded-2xl p-4 flex items-center gap-4 ${!emp.isActive ? "opacity-50" : ""}`}>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${emp.avatarColor} flex items-center justify-center font-oswald font-bold text-white text-sm shrink-0`}>
                  {emp.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-medium text-sm">{emp.name}</span>
                    <Badge className="text-xs bg-white/5 text-white/65 border-white/10">{ROLE_LABELS[emp.roleInCompany] || emp.roleInCompany}</Badge>
                    {!emp.isActive && <Badge className="text-xs bg-neon-pink/10 text-neon-pink border-neon-pink/20">Заблокирован</Badge>}
                    {deniedCount > 0 && (
                      <Badge className="text-xs bg-neon-pink/10 text-neon-pink border-neon-pink/20">
                        <Icon name="EyeOff" size={10} className="mr-1" />{deniedCount} ограничений
                      </Badge>
                    )}
                  </div>
                  <p className="text-white/65 text-xs">{emp.email}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEditProfile(emp)} title="Редактировать"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white/55 hover:text-neon-cyan hover:bg-neon-cyan/10 transition-colors">
                    <Icon name="Pencil" size={15} />
                  </button>
                  <button onClick={() => openEditPerms(emp)} title="Настроить доступ"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white/55 hover:text-neon-purple hover:bg-neon-purple/10 transition-colors">
                    <Icon name="ShieldCheck" size={15} />
                  </button>
                  <button onClick={() => toggleEmployee(emp)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${emp.isActive ? "text-white/55 hover:text-neon-pink hover:bg-neon-pink/10" : "text-neon-green hover:bg-neon-green/10"}`}
                    title={emp.isActive ? "Заблокировать" : "Восстановить"}>
                    <Icon name={emp.isActive ? "UserX" : "UserCheck"} size={15} />
                  </button>
                  <button onClick={() => setDeleteId(emp.id)} title="Удалить из БД"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white/55 hover:text-neon-pink hover:bg-neon-pink/10 transition-colors">
                    <Icon name="Trash2" size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Модалка редактирования профиля сотрудника */}
      {editProfileId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setEditProfileId(null)} />
          <div className="relative z-10 w-full max-w-sm glass-strong rounded-2xl p-6 border border-neon-cyan/20 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-oswald font-bold text-white flex items-center gap-2">
                <Icon name="Pencil" size={16} className="text-neon-cyan" />
                Редактировать сотрудника
              </h4>
              <button onClick={() => setEditProfileId(null)} className="text-white/55 hover:text-white transition-colors">
                <Icon name="X" size={16} />
              </button>
            </div>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs text-white/65 mb-1 block">Имя</label>
                <input value={editProfile.name} onChange={e => setEditProfile(f => ({ ...f, name: e.target.value }))}
                  className="w-full glass rounded-xl px-3 py-2.5 text-white outline-none border border-white/10 focus:border-neon-cyan/50 text-sm" />
              </div>
              <div>
                <label className="text-xs text-white/65 mb-1 block">Email</label>
                <input type="email" value={editProfile.email} onChange={e => setEditProfile(f => ({ ...f, email: e.target.value }))}
                  className="w-full glass rounded-xl px-3 py-2.5 text-white outline-none border border-white/10 focus:border-neon-cyan/50 text-sm" />
              </div>
              <div>
                <label className="text-xs text-white/65 mb-1 block">Роль</label>
                <select value={editProfile.roleInCompany} onChange={e => setEditProfile(f => ({ ...f, roleInCompany: e.target.value }))}
                  className="w-full glass rounded-xl px-3 py-2.5 text-white outline-none border border-white/10 text-sm appearance-none bg-transparent">
                  {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v} className="bg-gray-900">{l}</option>)}
                </select>
              </div>
            </div>
            {profileError && <p className="text-neon-pink text-xs flex items-center gap-1 mb-3"><Icon name="AlertCircle" size={12} />{profileError}</p>}
            <div className="flex gap-2">
              <button onClick={() => setEditProfileId(null)}
                className="flex-1 py-2.5 glass text-white/70 rounded-xl border border-white/10 text-sm hover:text-white transition-colors">
                Отмена
              </button>
              <button onClick={saveProfile} disabled={savingProfile}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-neon-cyan text-black rounded-xl text-sm font-oswald font-semibold hover:opacity-90 disabled:opacity-50">
                {savingProfile ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Check" size={14} />}Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка подтверждения удаления */}
      {deleteId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !deleting && setDeleteId(null)} />
          <div className="relative z-10 w-full max-w-sm glass-strong rounded-2xl p-6 border border-neon-pink/30 animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-neon-pink/15 flex items-center justify-center shrink-0">
                <Icon name="AlertTriangle" size={18} className="text-neon-pink" />
              </div>
              <h4 className="font-oswald font-bold text-white">Удалить сотрудника?</h4>
            </div>
            <p className="text-white/60 text-sm mb-2">
              <span className="text-white">{employees.find(e => e.id === deleteId)?.name}</span> будет полностью удалён из базы данных.
            </p>
            <p className="text-white/65 text-xs mb-5">
              Это действие нельзя отменить. Будут также удалены все его сообщения в чате компании и личной переписке.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteId(null)} disabled={deleting}
                className="flex-1 py-2.5 glass text-white/70 rounded-xl border border-white/10 text-sm hover:text-white transition-colors disabled:opacity-50">
                Отмена
              </button>
              <button onClick={confirmDelete} disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-neon-pink text-white rounded-xl text-sm font-oswald font-semibold hover:opacity-90 disabled:opacity-50">
                {deleting ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Trash2" size={14} />}Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}