import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import type { User, CompanyType } from "@/context/AuthContext";
import { EMPLOYEES_URL, AUTH_URL, type Employee } from "./profile/types";
import ProfileSection from "./profile/ProfileSection";
import RequisitesSection from "./profile/RequisitesSection";
import LogoSection from "./profile/LogoSection";
import EmployeesSection from "./profile/EmployeesSection";

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
  onProfileUpdate?: (fields: Partial<User>) => Promise<string | null>;
}

export default function DashboardProfileTab({
  user, isVenue, editMode, saving, editForm,
  onEditFormChange, onEditToggle, onSave, onCancelEdit, onLogout,
  onProfileUpdate,
}: DashboardProfileTabProps) {
  const [section, setSection] = useState<"profile" | "requisites" | "logo" | "employees">("profile");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empLoading, setEmpLoading] = useState(false);

  // Реквизиты
  const [reqForm, setReqForm] = useState({
    companyType: user.companyType || "ip",
    legalName: user.legalName || "",
    inn: user.inn || "",
    kpp: user.kpp || "",
    ogrn: user.ogrn || "",
    legalAddress: user.legalAddress || "",
    actualAddress: user.actualAddress || "",
    bankName: user.bankName || "",
    bankAccount: user.bankAccount || "",
    bankBik: user.bankBik || "",
    phone: user.phone || "",
  });
  const [reqSaving, setReqSaving] = useState(false);
  const [reqSaved, setReqSaved] = useState(false);

  // Логотип
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState(user.logoUrl || "");
  const [logoSaving, setLogoSaving] = useState(false);

  const loadEmployees = async () => {
    setEmpLoading(true);
    const data = await fetch(`${EMPLOYEES_URL}?action=list&company_user_id=${user.id}`).then(r => r.json());
    setEmployees(data.employees || []);
    setEmpLoading(false);
  };

  useEffect(() => {
    if (section === "employees") loadEmployees();
  }, [section]);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const saveLogo = async () => {
    if (!logoFile || !onProfileUpdate) return;
    setLogoSaving(true);
    try {
      const reader = new FileReader();
      const base64: string = await new Promise((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(logoFile);
      });

      const sessionId = localStorage.getItem("tourlink_session");
      const res = await fetch(`${AUTH_URL}?action=upload_logo`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Id": sessionId || "" },
        body: JSON.stringify({ logoBase64: base64, logoMime: logoFile.type }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Ошибка загрузки");

      await onProfileUpdate({ logoUrl: data.logoUrl });
      setLogoPreview(data.logoUrl);
      setLogoFile(null);
    } catch (e) {
      console.error("Logo upload error:", e);
    } finally {
      setLogoSaving(false);
    }
  };

  const saveRequisites = async () => {
    if (!onProfileUpdate) return;
    setReqSaving(true);
    await onProfileUpdate({
      companyType: reqForm.companyType as CompanyType,
      legalName: reqForm.legalName, inn: reqForm.inn, kpp: reqForm.kpp,
      ogrn: reqForm.ogrn, legalAddress: reqForm.legalAddress,
      actualAddress: reqForm.actualAddress, bankName: reqForm.bankName,
      bankAccount: reqForm.bankAccount, bankBik: reqForm.bankBik,
      phone: reqForm.phone,
    });
    setReqSaving(false);
    setReqSaved(true);
    setTimeout(() => setReqSaved(false), 2000);
  };

  const SECTIONS = [
    { id: "profile",    label: "Профиль",    icon: "User" },
    { id: "requisites", label: "Реквизиты",  icon: "FileText" },
    { id: "logo",       label: "Логотип",    icon: "Image" },
    { id: "employees",  label: "Сотрудники", icon: "Users" },
  ] as const;

  return (
    <div className="animate-fade-in max-w-3xl">
      <h2 className="font-oswald font-bold text-2xl text-white mb-6">Настройки профиля</h2>

      <div className="flex flex-wrap gap-1 mb-6 glass rounded-xl p-1 w-fit">
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-oswald font-medium transition-all ${section === s.id ? "bg-neon-purple text-white" : "text-white/50 hover:text-white"}`}>
            <Icon name={s.icon} size={14} />{s.label}
          </button>
        ))}
      </div>

      {section === "profile" && (
        <ProfileSection
          user={user}
          isVenue={isVenue}
          editMode={editMode}
          saving={saving}
          editForm={editForm}
          onEditFormChange={onEditFormChange}
          onEditToggle={onEditToggle}
          onSave={onSave}
          onCancelEdit={onCancelEdit}
          onLogout={onLogout}
        />
      )}

      {section === "requisites" && (
        <RequisitesSection
          user={user}
          reqForm={reqForm}
          reqSaving={reqSaving}
          reqSaved={reqSaved}
          onReqFormChange={setReqForm}
          onSave={saveRequisites}
        />
      )}

      {section === "logo" && (
        <LogoSection
          user={user}
          logoPreview={logoPreview}
          logoFile={logoFile}
          logoSaving={logoSaving}
          onLogoChange={handleLogoChange}
          onSaveLogo={saveLogo}
          onDeleteLogo={() => onProfileUpdate?.({ logoUrl: "" })}
        />
      )}

      {section === "employees" && (
        <EmployeesSection
          userId={user.id}
          employees={employees}
          empLoading={empLoading}
          onReload={loadEmployees}
        />
      )}
    </div>
  );
}
