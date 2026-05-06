import { useState } from "react";
import Icon from "@/components/ui/icon";
import { type Employee, type AccessPermissions, DEFAULT_ACCESS_PERMISSIONS, EMPLOYEES_URL } from "./types";
import EmployeeAddForm from "./employees/EmployeeAddForm";
import EmployeePermissionsModal from "./employees/EmployeePermissionsModal";
import EmployeeListItem from "./employees/EmployeeListItem";

interface EditForm { name: string; email: string; roleInCompany: string }

interface Props {
  userId: string;
  employees: Employee[];
  empLoading: boolean;
  onReload: () => void;
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

  // Документы сотрудника
  const [docsEmpId, setDocsEmpId] = useState<string | null>(null);

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
    } catch {
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

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-oswald font-bold text-white text-xl">Сотрудники компании</h3>
          <p className="text-white/65 text-xs mt-0.5">Сотрудники могут входить в личный кабинет и работать от имени компании</p>
        </div>
        <button onClick={() => setShowAddEmp(true)}
          className="flex items-center gap-2 px-4 py-2 bg-neon-purple text-white rounded-xl text-sm hover:opacity-90 transition-opacity font-oswald font-medium">
          <Icon name="UserPlus" size={15} />Добавить
        </button>
      </div>

      {/* Форма добавления */}
      {showAddEmp && (
        <EmployeeAddForm
          empForm={empForm}
          perms={perms}
          empError={empError}
          empSaving={empSaving}
          onFormChange={patch => setEmpForm(f => ({ ...f, ...patch }))}
          onPermsChange={setPerms}
          onAdd={addEmployee}
          onCancel={() => { setShowAddEmp(false); setEmpError(""); setPerms({ ...DEFAULT_ACCESS_PERMISSIONS }); }}
        />
      )}

      {/* Модалка редактирования прав */}
      {editPermId && (
        <EmployeePermissionsModal
          employeeName={employees.find(e => e.id === editPermId)?.name}
          editPerms={editPerms}
          savingPerms={savingPerms}
          onClose={() => setEditPermId(null)}
          onEditPerms={setEditPerms}
          onSave={savePermissions}
        />
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
          {employees.map(emp => (
            <EmployeeListItem
              key={emp.id}
              emp={emp}
              userId={userId}
              docsEmpId={docsEmpId}
              editProfileId={editProfileId}
              editProfile={editProfile}
              profileError={profileError}
              savingProfile={savingProfile}
              deleteId={deleteId}
              deleting={deleting}
              onToggleEmployee={toggleEmployee}
              onOpenEditPerms={openEditPerms}
              onOpenEditProfile={openEditProfile}
              onDocsToggle={id => setDocsEmpId(docsEmpId === id ? null : id)}
              onEditProfileChange={patch => setEditProfile(f => ({ ...f, ...patch }))}
              onSaveProfile={saveProfile}
              onCancelEditProfile={() => setEditProfileId(null)}
              onSetDeleteId={setDeleteId}
              onCancelDelete={() => setDeleteId(null)}
              onConfirmDelete={confirmDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
