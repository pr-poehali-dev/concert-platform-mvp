import Icon from "@/components/ui/icon";
import { type AccessPermissions, DEFAULT_ACCESS_PERMISSIONS, ROLE_LABELS } from "../types";
import { SECTION_ITEMS, PERM_ITEMS, SectionToggle, PermToggle } from "./EmployeePermissionControls";

interface EmpForm { name: string; email: string; password: string; roleInCompany: string }

interface Props {
  empForm: EmpForm;
  perms: AccessPermissions;
  empError: string;
  empSaving: boolean;
  onFormChange: (patch: Partial<EmpForm>) => void;
  onPermsChange: (perms: AccessPermissions) => void;
  onAdd: () => void;
  onCancel: () => void;
}

export default function EmployeeAddForm({
  empForm, perms, empError, empSaving,
  onFormChange, onPermsChange, onAdd, onCancel,
}: Props) {
  return (
    <div className="glass rounded-2xl p-5 border border-neon-purple/20 space-y-4">
      <h4 className="font-oswald font-bold text-white text-base">Новый сотрудник</h4>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-white/65 mb-1 block">Имя</label>
          <input value={empForm.name} onChange={e => onFormChange({ name: e.target.value })} placeholder="Иван Иванов"
            className="w-full glass rounded-xl px-3 py-2.5 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-purple/50 text-sm" />
        </div>
        <div>
          <label className="text-xs text-white/65 mb-1 block">Email</label>
          <input type="email" value={empForm.email} onChange={e => onFormChange({ email: e.target.value })} placeholder="emp@company.ru"
            className="w-full glass rounded-xl px-3 py-2.5 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-purple/50 text-sm" />
        </div>
        <div>
          <label className="text-xs text-white/65 mb-1 block">Пароль</label>
          <input type="password" value={empForm.password} onChange={e => onFormChange({ password: e.target.value })} placeholder="Минимум 6 символов"
            className="w-full glass rounded-xl px-3 py-2.5 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-purple/50 text-sm" />
        </div>
        <div>
          <label className="text-xs text-white/65 mb-1 block">Роль</label>
          <select value={empForm.roleInCompany} onChange={e => onFormChange({ roleInCompany: e.target.value })}
            className="w-full glass rounded-xl px-3 py-2.5 text-white outline-none border border-white/10 text-sm appearance-none bg-transparent">
            {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v} className="bg-gray-900">{l}</option>)}
          </select>
        </div>
      </div>

      {/* Доступные разделы */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-white/65 uppercase tracking-wider flex items-center gap-1.5">
            <Icon name="Layout" size={12} className="text-neon-cyan" />
            Доступные разделы
          </p>
          <div className="flex gap-1.5">
            <button type="button" onClick={() => onPermsChange({ ...perms, allowedSections: SECTION_ITEMS.map(s => s.id) })}
              className="text-[10px] text-neon-cyan hover:underline">все</button>
            <span className="text-white/30 text-[10px]">/</span>
            <button type="button" onClick={() => onPermsChange({ ...perms, allowedSections: [] })}
              className="text-[10px] text-neon-pink hover:underline">ни один</button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {SECTION_ITEMS.map(item => (
            <SectionToggle
              key={item.id}
              item={item}
              allowed={perms.allowedSections}
              onChange={sections => onPermsChange({ ...perms, allowedSections: sections })}
            />
          ))}
        </div>
      </div>

      {/* Настройка доступа к финансам */}
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
              value={perms[item.key as keyof Omit<AccessPermissions, 'allowedSections'>] as boolean}
              onChange={v => onPermsChange({ ...perms, [item.key]: v })}
            />
          ))}
        </div>
      </div>

      {empError && <p className="text-neon-pink text-xs flex items-center gap-1"><Icon name="AlertCircle" size={12} />{empError}</p>}
      <div className="flex gap-2">
        <button onClick={onCancel}
          className="flex-1 py-2 glass text-white/70 rounded-xl border border-white/10 text-sm hover:text-white">Отмена</button>
        <button onClick={onAdd} disabled={empSaving}
          className="flex-1 flex items-center justify-center gap-2 py-2 bg-neon-purple text-white rounded-xl text-sm hover:opacity-90 disabled:opacity-50">
          {empSaving ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="UserPlus" size={14} />}Добавить
        </button>
      </div>
    </div>
  );
}
