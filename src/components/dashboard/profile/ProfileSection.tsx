import { useState } from "react";
import Icon from "@/components/ui/icon";
import type { User } from "@/context/AuthContext";
import { CITIES, AUTH_URL, COMPANY_LABELS } from "./types";

interface Props {
  user: User;
  isVenue: boolean;
  editMode: boolean;
  saving: boolean;
  editForm: { name: string; city: string };
  onEditFormChange: (form: { name: string; city: string }) => void;
  onEditToggle: () => void;
  onSave: () => void;
  onCancelEdit: () => void;
  onLogout: () => void;
}

export default function ProfileSection({
  user, isVenue, editMode, saving, editForm,
  onEditFormChange, onEditToggle, onSave, onCancelEdit, onLogout,
}: Props) {
  const [pwModal, setPwModal] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  const closePwModal = () => {
    setPwModal(false);
    setPwError("");
    setPwSuccess(false);
    setPwForm({ current: "", next: "", confirm: "" });
  };

  const handleChangePassword = async () => {
    setPwError("");
    if (!pwForm.current || !pwForm.next || !pwForm.confirm) { setPwError("Заполните все поля"); return; }
    if (pwForm.next.length < 6) { setPwError("Новый пароль минимум 6 символов"); return; }
    if (pwForm.next !== pwForm.confirm) { setPwError("Пароли не совпадают"); return; }
    setPwSaving(true);
    const sessionId = localStorage.getItem("sessionId") || "";
    const res = await fetch(`${AUTH_URL}?action=change_password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Id": sessionId },
      body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
    });
    const data = await res.json();
    setPwSaving(false);
    if (!res.ok) { setPwError(data.error || "Ошибка"); return; }
    setPwSuccess(true);
    setPwForm({ current: "", next: "", confirm: "" });
    setTimeout(() => { setPwModal(false); setPwSuccess(false); }, 1500);
  };

  return (
    <>
      <div className="glass rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            {user.logoUrl ? (
              <img src={user.logoUrl} alt="logo" className="w-14 h-14 rounded-xl object-cover border border-white/10" />
            ) : (
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${user.avatarColor} flex items-center justify-center font-oswald font-bold text-2xl text-white`}>
                {user.avatar}
              </div>
            )}
            <div>
              <p className="text-white font-medium">{user.name}</p>
              <p className="text-white/40 text-sm">{user.email}</p>
              <p className="text-white/30 text-xs">{COMPANY_LABELS[user.companyType] || "—"}</p>
            </div>
          </div>
          {!editMode ? (
            <button onClick={onEditToggle} className="flex items-center gap-2 px-4 py-2 glass text-white/60 hover:text-white rounded-xl border border-white/10 hover:border-white/20 transition-all text-sm">
              <Icon name="Pencil" size={14} />Редактировать
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={onCancelEdit} className="px-4 py-2 glass text-white/50 rounded-xl border border-white/10 text-sm hover:text-white transition-colors">Отмена</button>
              <button onClick={onSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-neon-purple text-white rounded-xl text-sm hover:opacity-90 disabled:opacity-50">
                {saving ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Check" size={14} />}Сохранить
              </button>
            </div>
          )}
        </div>

        <div className="h-px bg-white/10" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">{isVenue ? "Название площадки" : "Имя"}</label>
            {editMode ? (
              <input value={editForm.name} onChange={e => onEditFormChange({ ...editForm, name: e.target.value })}
                className="w-full glass rounded-xl px-4 py-3 text-white outline-none border border-white/10 focus:border-neon-purple/50 text-sm" />
            ) : <p className="text-white text-sm py-3 px-4 glass rounded-xl border border-white/5">{user.name}</p>}
          </div>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Город</label>
            {editMode ? (
              <select value={editForm.city} onChange={e => onEditFormChange({ ...editForm, city: e.target.value })}
                className="w-full glass rounded-xl px-4 py-3 text-white outline-none border border-white/10 focus:border-neon-purple/50 text-sm appearance-none bg-transparent">
                {CITIES.map(c => <option key={c} value={c} className="bg-gray-900">{c}</option>)}
              </select>
            ) : <p className="text-white text-sm py-3 px-4 glass rounded-xl border border-white/5">{user.city || "Не указан"}</p>}
          </div>
        </div>

        <div>
          <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Email</label>
          <p className="text-white/50 text-sm py-3 px-4 glass rounded-xl border border-white/5">{user.email}</p>
        </div>

        <div>
          <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Роль</label>
          <div className="flex items-center gap-2 py-3 px-4 glass rounded-xl border border-white/5">
            <Icon name={isVenue ? "Building2" : "Route"} size={15} className={isVenue ? "text-neon-cyan" : "text-neon-purple"} />
            <span className="text-white text-sm">{isVenue ? "Концертная площадка" : "Организатор туров"}</span>
          </div>
        </div>

        <div className="h-px bg-white/10" />
        <div>
          <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">Смена пароля</label>
          <button onClick={() => setPwModal(true)} className="flex items-center gap-2 px-4 py-2.5 glass text-white/60 hover:text-white rounded-xl border border-white/10 hover:border-white/20 transition-all text-sm">
            <Icon name="Lock" size={14} />Изменить пароль
          </button>
        </div>
        <div className="h-px bg-white/10" />
        <div>
          <button onClick={onLogout} className="flex items-center gap-2 text-neon-pink hover:text-white text-sm transition-colors">
            <Icon name="LogOut" size={14} />Выйти из аккаунта
          </button>
        </div>
      </div>

      {/* Модалка смены пароля */}
      {pwModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closePwModal} />
          <div className="relative z-10 w-full max-w-sm glass-strong rounded-2xl p-6 border border-white/10 animate-scale-in">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-oswald font-bold text-white text-lg flex items-center gap-2">
                <Icon name="Lock" size={18} className="text-neon-purple" />Смена пароля
              </h3>
              <button onClick={closePwModal} className="text-white/30 hover:text-white transition-colors">
                <Icon name="X" size={16} />
              </button>
            </div>
            {pwSuccess ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-12 h-12 rounded-full bg-neon-green/20 flex items-center justify-center">
                  <Icon name="Check" size={24} className="text-neon-green" />
                </div>
                <p className="text-neon-green font-medium">Пароль успешно изменён!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  { label: "Текущий пароль", key: "current" },
                  { label: "Новый пароль", key: "next" },
                  { label: "Повторите новый пароль", key: "confirm" },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">{f.label}</label>
                    <input type="password" value={pwForm[f.key as keyof typeof pwForm]}
                      onChange={e => setPwForm(p => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full glass rounded-xl px-4 py-2.5 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-purple/50 text-sm" />
                  </div>
                ))}
                {pwError && (
                  <p className="text-neon-pink text-xs flex items-center gap-1.5 bg-neon-pink/10 px-3 py-2 rounded-lg border border-neon-pink/20">
                    <Icon name="AlertCircle" size={13} />{pwError}
                  </p>
                )}
                <div className="flex gap-2 pt-1">
                  <button onClick={closePwModal}
                    className="flex-1 py-2.5 glass text-white/50 rounded-xl border border-white/10 text-sm hover:text-white transition-colors">
                    Отмена
                  </button>
                  <button onClick={handleChangePassword} disabled={pwSaving}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl text-sm hover:opacity-90 disabled:opacity-50 transition-opacity">
                    {pwSaving ? <><Icon name="Loader2" size={14} className="animate-spin" />Сохраняю...</> : "Сохранить"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
