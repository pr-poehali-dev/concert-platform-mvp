import Icon from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { type Employee, type AccessPermissions, DEFAULT_ACCESS_PERMISSIONS, ROLE_LABELS, EMPLOYEES_URL, formatEmployeeLastSeen } from "../types";
import EmployeeDocuments from "@/components/dashboard/company/EmployeeDocuments";
import { SECTION_ITEMS } from "./EmployeePermissionControls";

interface EditForm { name: string; email: string; roleInCompany: string }

interface Props {
  emp: Employee;
  userId: string;
  docsEmpId: string | null;
  editProfileId: string | null;
  editProfile: EditForm;
  profileError: string;
  savingProfile: boolean;
  deleteId: string | null;
  deleting: boolean;
  onToggleEmployee: (emp: Employee) => void;
  onOpenEditPerms: (emp: Employee) => void;
  onOpenEditProfile: (emp: Employee) => void;
  onDocsToggle: (id: string) => void;
  onEditProfileChange: (patch: Partial<EditForm>) => void;
  onSaveProfile: () => void;
  onCancelEditProfile: () => void;
  onSetDeleteId: (id: string) => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}

export default function EmployeeListItem({
  emp, userId, docsEmpId,
  editProfileId, editProfile, profileError, savingProfile,
  deleteId, deleting,
  onToggleEmployee, onOpenEditPerms, onOpenEditProfile, onDocsToggle,
  onEditProfileChange, onSaveProfile, onCancelEditProfile,
  onSetDeleteId, onCancelDelete, onConfirmDelete,
}: Props) {
  const p = emp.accessPermissions || DEFAULT_ACCESS_PERMISSIONS;
  const deniedFinance = (["canViewExpenses","canViewIncome","canViewSummary","canEditExpenses","canEditIncome"] as const).filter(k => !p[k]).length;
  const deniedSections = SECTION_ITEMS.length - (p.allowedSections?.length ?? SECTION_ITEMS.length);
  const deniedCount = deniedFinance + (deniedSections > 0 ? 1 : 0);

  return (
    <div className="space-y-0">
      <div className={`glass rounded-2xl p-4 flex items-center gap-4 ${!emp.isActive ? "opacity-50" : ""}`}>
        <div className="relative shrink-0">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${emp.avatarColor} flex items-center justify-center font-oswald font-bold text-white text-sm`}>
            {emp.avatar}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-bold text-sm">{emp.name}</span>
            {emp.displayId && (
              <span className="text-white/30 text-[10px] font-mono">{emp.displayId}</span>
            )}
            <Badge className="text-xs bg-white/5 text-white/65 border-white/10">{ROLE_LABELS[emp.roleInCompany] || emp.roleInCompany}</Badge>
            {!emp.isActive && <Badge className="text-xs bg-neon-pink/10 text-neon-pink border-neon-pink/20">Заблокирован</Badge>}
            {deniedCount > 0 && (
              <Badge className="text-xs bg-neon-pink/10 text-neon-pink border-neon-pink/20">
                <Icon name="EyeOff" size={10} className="mr-1" />{deniedCount} ограничений
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <p className="text-white/65 text-xs">{emp.email}</p>
            {emp.salaryAmount != null && (
              <span className="flex items-center gap-1 text-xs text-neon-green/80">
                <Icon name="Banknote" size={11} />
                {emp.salaryAmount.toLocaleString("ru")} ₽/мес
              </span>
            )}
            {(() => {
              const ls = formatEmployeeLastSeen(emp.lastSeen);
              return (
                <span className="flex items-center gap-1.5 text-xs">
                  <span className={`w-1.5 h-1.5 rounded-full ${ls.dot} ${ls.isOnline ? "animate-pulse" : ""}`} />
                  <span className={ls.color}>{ls.text}</span>
                </span>
              );
            })()}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onOpenEditProfile(emp)} title="Редактировать"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/55 hover:text-neon-cyan hover:bg-neon-cyan/10 transition-colors">
            <Icon name="Pencil" size={15} />
          </button>
          <button onClick={() => onOpenEditPerms(emp)} title="Настроить доступ"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/55 hover:text-neon-purple hover:bg-neon-purple/10 transition-colors">
            <Icon name="ShieldCheck" size={15} />
          </button>
          <button onClick={() => onDocsToggle(emp.id)} title="Документы"
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${docsEmpId === emp.id ? "text-neon-cyan bg-neon-cyan/10" : "text-white/55 hover:text-neon-cyan hover:bg-neon-cyan/10"}`}>
            <Icon name="FolderOpen" size={15} />
          </button>
          <button onClick={() => onToggleEmployee(emp)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${emp.isActive ? "text-white/55 hover:text-neon-pink hover:bg-neon-pink/10" : "text-neon-green hover:bg-neon-green/10"}`}
            title={emp.isActive ? "Заблокировать" : "Восстановить"}>
            <Icon name={emp.isActive ? "UserX" : "UserCheck"} size={15} />
          </button>
          <button onClick={() => onSetDeleteId(emp.id)} title="Удалить из БД"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/55 hover:text-neon-pink hover:bg-neon-pink/10 transition-colors">
            <Icon name="Trash2" size={15} />
          </button>
        </div>
      </div>

      {/* Блок документов — раскрывается под карточкой */}
      {docsEmpId === emp.id && (
        <div className="mt-2 glass rounded-2xl border border-neon-cyan/15 p-4 animate-fade-in">
          <EmployeeDocuments
            employeeId={emp.id}
            employeeName={emp.name}
            employeeEmail={emp.email}
            companyId={userId}
          />
        </div>
      )}

      {/* Модалка редактирования профиля сотрудника */}
      {editProfileId === emp.id && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancelEditProfile} />
          <div className="relative z-10 w-full max-w-sm glass-strong rounded-2xl p-6 border border-neon-cyan/20 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-oswald font-bold text-white flex items-center gap-2">
                <Icon name="Pencil" size={16} className="text-neon-cyan" />
                Редактировать сотрудника
              </h4>
              <button onClick={onCancelEditProfile} className="text-white/55 hover:text-white transition-colors">
                <Icon name="X" size={16} />
              </button>
            </div>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs text-white/65 mb-1 block">Имя</label>
                <input value={editProfile.name} onChange={e => onEditProfileChange({ name: e.target.value })}
                  className="w-full glass rounded-xl px-3 py-2.5 text-white outline-none border border-white/10 focus:border-neon-cyan/50 text-sm" />
              </div>
              <div>
                <label className="text-xs text-white/65 mb-1 block">Email</label>
                <input type="email" value={editProfile.email} onChange={e => onEditProfileChange({ email: e.target.value })}
                  className="w-full glass rounded-xl px-3 py-2.5 text-white outline-none border border-white/10 focus:border-neon-cyan/50 text-sm" />
              </div>
              <div>
                <label className="text-xs text-white/65 mb-1 block">Роль</label>
                <select value={editProfile.roleInCompany} onChange={e => onEditProfileChange({ roleInCompany: e.target.value })}
                  className="w-full glass rounded-xl px-3 py-2.5 text-white outline-none border border-white/10 text-sm appearance-none bg-transparent">
                  {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v} className="bg-gray-900">{l}</option>)}
                </select>
              </div>
            </div>
            {profileError && <p className="text-neon-pink text-xs flex items-center gap-1 mb-3"><Icon name="AlertCircle" size={12} />{profileError}</p>}
            <div className="flex gap-2">
              <button onClick={onCancelEditProfile}
                className="flex-1 py-2.5 glass text-white/70 rounded-xl border border-white/10 text-sm hover:text-white transition-colors">
                Отмена
              </button>
              <button onClick={onSaveProfile} disabled={savingProfile}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-neon-cyan text-black rounded-xl text-sm font-oswald font-semibold hover:opacity-90 disabled:opacity-50">
                {savingProfile ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Check" size={14} />}Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка подтверждения удаления */}
      {deleteId === emp.id && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !deleting && onCancelDelete()} />
          <div className="relative z-10 w-full max-w-sm glass-strong rounded-2xl p-6 border border-neon-pink/30 animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-neon-pink/15 flex items-center justify-center shrink-0">
                <Icon name="AlertTriangle" size={18} className="text-neon-pink" />
              </div>
              <h4 className="font-oswald font-bold text-white">Удалить сотрудника?</h4>
            </div>
            <p className="text-white/60 text-sm mb-2">
              <span className="text-white">{emp.name}</span> будет полностью удалён из базы данных.
            </p>
            <p className="text-white/65 text-xs mb-5">
              Это действие нельзя отменить. Будут также удалены все его сообщения в чате компании и личной переписке.
            </p>
            <div className="flex gap-2">
              <button onClick={onCancelDelete} disabled={deleting}
                className="flex-1 py-2.5 glass text-white/70 rounded-xl border border-white/10 text-sm hover:text-white transition-colors disabled:opacity-50">
                Отмена
              </button>
              <button onClick={onConfirmDelete} disabled={deleting}
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
