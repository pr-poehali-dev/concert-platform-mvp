import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { type Employee, ROLE_LABELS, EMPLOYEES_URL } from "./types";

interface Props {
  userId: string;
  employees: Employee[];
  empLoading: boolean;
  onReload: () => void;
}

export default function EmployeesSection({ userId, employees, empLoading, onReload }: Props) {
  const [showAddEmp, setShowAddEmp] = useState(false);
  const [empForm, setEmpForm] = useState({ name: "", email: "", password: "", roleInCompany: "employee" });
  const [empError, setEmpError] = useState("");
  const [empSaving, setEmpSaving] = useState(false);

  const addEmployee = async () => {
    setEmpError("");
    if (!empForm.name.trim()) return setEmpError("Введите имя");
    if (!empForm.email.includes("@")) return setEmpError("Некорректный email");
    if (empForm.password.length < 6) return setEmpError("Пароль минимум 6 символов");
    setEmpSaving(true);
    const res = await fetch(`${EMPLOYEES_URL}?action=add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyUserId: userId, ...empForm }),
    });
    const data = await res.json();
    setEmpSaving(false);
    if (!res.ok) { setEmpError(data.error || "Ошибка"); return; }
    setEmpForm({ name: "", email: "", password: "", roleInCompany: "employee" });
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

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-oswald font-semibold text-white text-lg">Сотрудники компании</h3>
          <p className="text-white/40 text-xs mt-0.5">Сотрудники могут входить в личный кабинет и работать от имени компании</p>
        </div>
        <button onClick={() => setShowAddEmp(true)}
          className="flex items-center gap-2 px-4 py-2 bg-neon-purple text-white rounded-xl text-sm hover:opacity-90 transition-opacity font-oswald font-medium">
          <Icon name="UserPlus" size={15} />Добавить
        </button>
      </div>

      {showAddEmp && (
        <div className="glass rounded-2xl p-5 border border-neon-purple/20 space-y-3">
          <h4 className="font-oswald font-semibold text-white text-sm mb-3">Новый сотрудник</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/40 mb-1 block">Имя</label>
              <input value={empForm.name} onChange={e => setEmpForm(f => ({ ...f, name: e.target.value }))} placeholder="Иван Иванов"
                className="w-full glass rounded-xl px-3 py-2.5 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-purple/50 text-sm" />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Email</label>
              <input type="email" value={empForm.email} onChange={e => setEmpForm(f => ({ ...f, email: e.target.value }))} placeholder="emp@company.ru"
                className="w-full glass rounded-xl px-3 py-2.5 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-purple/50 text-sm" />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Пароль</label>
              <input type="password" value={empForm.password} onChange={e => setEmpForm(f => ({ ...f, password: e.target.value }))} placeholder="Минимум 6 символов"
                className="w-full glass rounded-xl px-3 py-2.5 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-purple/50 text-sm" />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Роль</label>
              <select value={empForm.roleInCompany} onChange={e => setEmpForm(f => ({ ...f, roleInCompany: e.target.value }))}
                className="w-full glass rounded-xl px-3 py-2.5 text-white outline-none border border-white/10 text-sm appearance-none bg-transparent">
                {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v} className="bg-gray-900">{l}</option>)}
              </select>
            </div>
          </div>
          {empError && <p className="text-neon-pink text-xs flex items-center gap-1"><Icon name="AlertCircle" size={12} />{empError}</p>}
          <div className="flex gap-2">
            <button onClick={() => { setShowAddEmp(false); setEmpError(""); }} className="flex-1 py-2 glass text-white/50 rounded-xl border border-white/10 text-sm hover:text-white">Отмена</button>
            <button onClick={addEmployee} disabled={empSaving}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-neon-purple text-white rounded-xl text-sm hover:opacity-90 disabled:opacity-50">
              {empSaving ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="UserPlus" size={14} />}Добавить
            </button>
          </div>
        </div>
      )}

      {empLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="glass rounded-2xl h-16 animate-pulse" />)}</div>
      ) : employees.length === 0 ? (
        <div className="text-center py-12 glass rounded-2xl">
          <Icon name="Users" size={36} className="text-white/20 mx-auto mb-3" />
          <p className="text-white/40 text-sm">Нет сотрудников</p>
          <p className="text-white/25 text-xs mt-1">Добавьте первого сотрудника</p>
        </div>
      ) : (
        <div className="space-y-2">
          {employees.map(emp => (
            <div key={emp.id} className={`glass rounded-2xl p-4 flex items-center gap-4 ${!emp.isActive ? "opacity-50" : ""}`}>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${emp.avatarColor} flex items-center justify-center font-oswald font-bold text-white text-sm shrink-0`}>
                {emp.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium text-sm">{emp.name}</span>
                  <Badge className="text-xs bg-white/5 text-white/40 border-white/10">{ROLE_LABELS[emp.roleInCompany] || emp.roleInCompany}</Badge>
                  {!emp.isActive && <Badge className="text-xs bg-neon-pink/10 text-neon-pink border-neon-pink/20">Заблокирован</Badge>}
                </div>
                <p className="text-white/40 text-xs">{emp.email}</p>
              </div>
              <button onClick={() => toggleEmployee(emp)}
                className={`p-2 rounded-lg transition-colors ${emp.isActive ? "text-white/30 hover:text-neon-pink hover:bg-neon-pink/10" : "text-neon-green hover:bg-neon-green/10"}`}
                title={emp.isActive ? "Заблокировать" : "Восстановить"}>
                <Icon name={emp.isActive ? "UserX" : "UserCheck"} size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
