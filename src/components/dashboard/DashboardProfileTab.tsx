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
  const [section, setSection] = useState<"profile" | "security" | "requisites" | "logo" | "employees">("profile");
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

  // 2FA
  const [tfaEnabled, setTfaEnabled] = useState(!!user.twofaEnabled);
  const [tfaLoading, setTfaLoading] = useState(false);
  const [tfaMsg, setTfaMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const toggleTfa = async () => {
    setTfaLoading(true);
    setTfaMsg(null);
    try {
      const sessionId = localStorage.getItem("tourlink_session");
      const res = await fetch(`${AUTH_URL}?action=toggle_2fa`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Id": sessionId || "" },
        body: JSON.stringify({ enable: !tfaEnabled }),
      });
      const data = await res.json();
      if (!res.ok) { setTfaMsg({ ok: false, text: data.error || "Ошибка" }); return; }
      setTfaEnabled(data.twofaEnabled);
      setTfaMsg({ ok: true, text: data.twofaEnabled ? "Двухфакторная аутентификация включена" : "Двухфакторная аутентификация отключена" });
    } catch { setTfaMsg({ ok: false, text: "Ошибка соединения" }); }
    finally { setTfaLoading(false); }
  };

  const SECTIONS = [
    { id: "profile",    label: "Профиль",    icon: "User" },
    { id: "security",   label: "Безопасность", icon: "ShieldCheck" },
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

      {section === "security" && (
        <div className="space-y-4 max-w-lg">
          {/* 2FA card */}
          <div className="glass rounded-2xl border border-white/10 p-6">
            <div className="flex items-start gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${tfaEnabled ? "bg-neon-cyan/15 border border-neon-cyan/25" : "bg-white/5 border border-white/10"}`}>
                <Icon name="ShieldCheck" size={20} className={tfaEnabled ? "text-neon-cyan" : "text-white/30"} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-oswald font-semibold text-white text-base">Двухфакторная аутентификация</h3>
                    <p className="text-white/40 text-sm mt-0.5">
                      {tfaEnabled
                        ? "При входе будет отправлен код на вашу почту"
                        : "Дополнительная защита аккаунта через код на почте"}
                    </p>
                  </div>
                  {/* Toggle */}
                  <button
                    onClick={toggleTfa}
                    disabled={tfaLoading || !user.verified}
                    className={`relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0 disabled:opacity-40 ${tfaEnabled ? "bg-neon-cyan" : "bg-white/15"}`}
                  >
                    {tfaLoading
                      ? <span className="absolute inset-0 flex items-center justify-center"><Icon name="Loader2" size={12} className="animate-spin text-white" /></span>
                      : <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${tfaEnabled ? "left-6" : "left-0.5"}`} />
                    }
                  </button>
                </div>

                {!user.verified && (
                  <div className="mt-3 flex items-center gap-2 text-amber-400/80 text-xs bg-amber-400/5 border border-amber-400/15 rounded-xl px-3 py-2">
                    <Icon name="AlertTriangle" size={13} />
                    Подтвердите email чтобы включить 2FA
                  </div>
                )}

                {tfaMsg && (
                  <div className={`mt-3 flex items-center gap-2 text-sm rounded-xl px-3 py-2 border ${tfaMsg.ok ? "text-neon-cyan bg-neon-cyan/5 border-neon-cyan/20" : "text-neon-pink bg-neon-pink/5 border-neon-pink/20"}`}>
                    <Icon name={tfaMsg.ok ? "CheckCircle2" : "AlertCircle"} size={14} />
                    {tfaMsg.text}
                  </div>
                )}

                <div className="mt-4 space-y-1.5 text-white/30 text-xs">
                  <p className="flex items-center gap-2"><Icon name="Check" size={11} className="text-neon-cyan/50" />Код приходит на вашу верифицированную почту</p>
                  <p className="flex items-center gap-2"><Icon name="Check" size={11} className="text-neon-cyan/50" />Код действует 10 минут</p>
                  <p className="flex items-center gap-2"><Icon name="Check" size={11} className="text-neon-cyan/50" />Защищает от несанкционированного входа</p>
                </div>
              </div>
            </div>
          </div>

          {/* Hint about registration setting */}
          <div className="flex items-start gap-2.5 text-white/25 text-xs bg-white/3 rounded-xl px-4 py-3 border border-white/5">
            <Icon name="Info" size={13} className="flex-shrink-0 mt-0.5" />
            <p>Включить 2FA можно здесь или при регистрации. Рекомендуем включить, если аккаунт содержит важные данные.</p>
          </div>
        </div>
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