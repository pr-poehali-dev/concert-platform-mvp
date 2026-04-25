import Icon from "@/components/ui/icon";
import type { User } from "@/context/AuthContext";

const CITIES = ["Москва", "Санкт-Петербург", "Екатеринбург", "Новосибирск", "Казань", "Ростов-на-Дону", "Краснодар", "Воронеж", "Самара", "Уфа"];

interface DashboardProfileTabProps {
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

export default function DashboardProfileTab({
  user,
  isVenue,
  editMode,
  saving,
  editForm,
  onEditFormChange,
  onEditToggle,
  onSave,
  onCancelEdit,
  onLogout,
}: DashboardProfileTabProps) {
  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-oswald font-bold text-2xl text-white">Редактирование профиля</h2>
        {!editMode ? (
          <button onClick={onEditToggle}
            className="flex items-center gap-2 px-4 py-2 glass text-white/60 hover:text-white rounded-xl border border-white/10 hover:border-white/20 transition-all text-sm">
            <Icon name="Pencil" size={14} />Редактировать
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={onCancelEdit}
              className="px-4 py-2 glass text-white/50 rounded-xl border border-white/10 text-sm hover:text-white transition-colors">
              Отмена
            </button>
            <button onClick={onSave} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-neon-purple text-white rounded-xl text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
              {saving ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Check" size={14} />}
              Сохранить
            </button>
          </div>
        )}
      </div>

      <div className="glass rounded-2xl p-6 space-y-5">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${user.avatarColor} flex items-center justify-center font-oswald font-bold text-2xl text-white`}>
            {user.avatar}
          </div>
          <div>
            <p className="text-white font-medium">{user.name}</p>
            <p className="text-white/40 text-sm">{user.email}</p>
          </div>
        </div>

        <div className="h-px bg-white/10" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">
              {isVenue ? "Название площадки" : "Имя"}
            </label>
            {editMode ? (
              <input
                value={editForm.name}
                onChange={e => onEditFormChange({ ...editForm, name: e.target.value })}
                className="w-full glass rounded-xl px-4 py-3 text-white outline-none border border-white/10 focus:border-neon-purple/50 transition-colors text-sm"
              />
            ) : (
              <p className="text-white text-sm py-3 px-4 glass rounded-xl border border-white/5">{user.name}</p>
            )}
          </div>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Город</label>
            {editMode ? (
              <select
                value={editForm.city}
                onChange={e => onEditFormChange({ ...editForm, city: e.target.value })}
                className="w-full glass rounded-xl px-4 py-3 text-white outline-none border border-white/10 focus:border-neon-purple/50 transition-colors text-sm appearance-none bg-transparent">
                {CITIES.map(c => <option key={c} value={c} className="bg-gray-900">{c}</option>)}
              </select>
            ) : (
              <p className="text-white text-sm py-3 px-4 glass rounded-xl border border-white/5">{user.city || "Не указан"}</p>
            )}
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
          <button className="flex items-center gap-2 px-4 py-2.5 glass text-white/60 hover:text-white rounded-xl border border-white/10 hover:border-white/20 transition-all text-sm">
            <Icon name="Lock" size={14} />Изменить пароль
          </button>
        </div>

        <div className="h-px bg-white/10" />

        <div>
          <button onClick={onLogout}
            className="flex items-center gap-2 text-neon-pink hover:text-white text-sm transition-colors">
            <Icon name="LogOut" size={14} />Выйти из аккаунта
          </button>
        </div>
      </div>
    </div>
  );
}
