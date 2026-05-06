import Icon from "@/components/ui/icon";
import { type AccessPermissions } from "../types";
import { SECTION_ITEMS, PERM_ITEMS, SectionToggle, PermToggle } from "./EmployeePermissionControls";

interface Props {
  employeeName: string | undefined;
  editPerms: AccessPermissions;
  savingPerms: boolean;
  onClose: () => void;
  onEditPerms: (perms: AccessPermissions) => void;
  onSave: () => void;
}

export default function EmployeePermissionsModal({
  employeeName, editPerms, savingPerms, onClose, onEditPerms, onSave,
}: Props) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm glass-strong rounded-2xl p-6 border border-neon-purple/20 animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-oswald font-bold text-white flex items-center gap-2">
            <Icon name="ShieldCheck" size={16} className="text-neon-purple" />
            Права доступа
          </h4>
          <button onClick={onClose} className="text-white/55 hover:text-white transition-colors">
            <Icon name="X" size={16} />
          </button>
        </div>
        <p className="text-white/65 text-xs mb-4">
          Сотрудник: <span className="text-white font-semibold">{employeeName}</span>
        </p>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto scrollbar-thin pr-1 mb-5">
          {/* Разделы */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-white/55 uppercase tracking-wider flex items-center gap-1.5">
                <Icon name="Layout" size={11} className="text-neon-cyan" />
                Доступные разделы
              </p>
              <div className="flex gap-1.5">
                <button type="button" onClick={() => onEditPerms({ ...editPerms, allowedSections: SECTION_ITEMS.map(s => s.id) })}
                  className="text-[10px] text-neon-cyan hover:underline">все</button>
                <span className="text-white/30 text-[10px]">/</span>
                <button type="button" onClick={() => onEditPerms({ ...editPerms, allowedSections: [] })}
                  className="text-[10px] text-neon-pink hover:underline">ни один</button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {SECTION_ITEMS.map(item => (
                <SectionToggle
                  key={item.id}
                  item={item}
                  allowed={editPerms.allowedSections}
                  onChange={sections => onEditPerms({ ...editPerms, allowedSections: sections })}
                />
              ))}
            </div>
          </div>
          {/* Финансы */}
          <div>
            <p className="text-[11px] text-white/55 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Icon name="ShieldCheck" size={11} className="text-neon-purple" />
              Финансовая информация
            </p>
            <div className="space-y-1.5">
              {PERM_ITEMS.map(item => (
                <PermToggle
                  key={item.key}
                  label={item.label}
                  description={item.description}
                  icon={item.icon}
                  color={item.color}
                  value={editPerms[item.key as keyof Omit<AccessPermissions, 'allowedSections'>] as boolean}
                  onChange={v => onEditPerms({ ...editPerms, [item.key]: v })}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 glass text-white/70 rounded-xl border border-white/10 text-sm hover:text-white transition-colors">
            Отмена
          </button>
          <button onClick={onSave} disabled={savingPerms}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-neon-purple text-white rounded-xl text-sm font-oswald font-semibold hover:opacity-90 disabled:opacity-50">
            {savingPerms ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Check" size={14} />}Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
