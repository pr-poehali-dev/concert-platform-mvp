import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import type { User, CompanyType } from "@/context/AuthContext";

const CITIES = ["Москва","Санкт-Петербург","Екатеринбург","Новосибирск","Казань","Ростов-на-Дону","Краснодар","Воронеж","Самара","Уфа"];
const EMPLOYEES_URL = "https://functions.poehali.dev/cc27106d-e3a4-4d7a-b6c2-47eb9365104e";
const AUTH_URL = "https://functions.poehali.dev/f5e06ba0-2cd8-4b53-8899-3cfc3badc3e8";

const COMPANY_LABELS: Record<CompanyType, string> = {
  individual: "Физическое лицо",
  ip:  "ИП",
  ooo: "ООО",
  other: "Другая форма",
};

const ROLE_LABELS: Record<string, string> = {
  employee:   "Сотрудник",
  manager:    "Менеджер",
  accountant: "Бухгалтер",
  admin:      "Администратор",
};

interface Employee {
  id: string; name: string; email: string;
  roleInCompany: string; avatar: string; avatarColor: string;
  isActive: boolean; createdAt: string;
}

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
  const [section, setSection] = useState<"profile"|"requisites"|"logo"|"employees">("profile");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empLoading, setEmpLoading] = useState(false);
  const [showAddEmp, setShowAddEmp] = useState(false);
  const [empForm, setEmpForm] = useState({ name:"", email:"", password:"", roleInCompany:"employee" });
  const [empError, setEmpError] = useState("");
  const [empSaving, setEmpSaving] = useState(false);

  // Реквизиты — локальная форма редактирования
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

  // Загрузка логотипа base64 → S3 через venues endpoint (или inline CDN)
  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const saveLogo = async () => {
    if (!logoFile || !onProfileUpdate) return;
    setLogoSaving(true);
    // Конвертируем в base64 и загружаем через auth update_profile
    // Для упрощения — используем data-URL (CDN upload нужен отдельный endpoint)
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string);
      // Загружаем через специальный endpoint логотипа
      const sessionId = localStorage.getItem("tourlink_session");
      const res = await fetch(`${AUTH_URL}?action=upload_logo`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Id": sessionId || "" },
        body: JSON.stringify({ logoBase64: base64.split(",")[1], logoMime: logoFile.type }),
      });
      const data = await res.json();
      if (data.logoUrl) {
        await onProfileUpdate({ logoUrl: data.logoUrl });
      } else {
        // Fallback: сохраняем data-url локально (при отсутствии endpoint)
        await onProfileUpdate({ logoUrl: base64 });
      }
      setLogoSaving(false);
      setLogoFile(null);
    };
    reader.readAsDataURL(logoFile);
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

  const addEmployee = async () => {
    setEmpError("");
    if (!empForm.name.trim()) return setEmpError("Введите имя");
    if (!empForm.email.includes("@")) return setEmpError("Некорректный email");
    if (empForm.password.length < 6) return setEmpError("Пароль минимум 6 символов");
    setEmpSaving(true);
    const res = await fetch(`${EMPLOYEES_URL}?action=add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyUserId: user.id, ...empForm }),
    });
    const data = await res.json();
    setEmpSaving(false);
    if (!res.ok) { setEmpError(data.error || "Ошибка"); return; }
    setEmpForm({ name:"", email:"", password:"", roleInCompany:"employee" });
    setShowAddEmp(false);
    loadEmployees();
  };

  const toggleEmployee = async (emp: Employee) => {
    const action = emp.isActive ? "deactivate" : "activate";
    await fetch(`${EMPLOYEES_URL}?action=${action}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: emp.id }),
    });
    loadEmployees();
  };

  const SECTIONS = [
    { id: "profile",    label: "Профиль",     icon: "User" },
    { id: "requisites", label: "Реквизиты",   icon: "FileText" },
    { id: "logo",       label: "Логотип",     icon: "Image" },
    { id: "employees",  label: "Сотрудники",  icon: "Users" },
  ] as const;

  return (
    <div className="animate-fade-in max-w-3xl">
      <h2 className="font-oswald font-bold text-2xl text-white mb-6">Настройки профиля</h2>

      {/* Sub-tabs */}
      <div className="flex flex-wrap gap-1 mb-6 glass rounded-xl p-1 w-fit">
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-oswald font-medium transition-all ${section === s.id ? "bg-neon-purple text-white" : "text-white/50 hover:text-white"}`}>
            <Icon name={s.icon} size={14} />{s.label}
          </button>
        ))}
      </div>

      {/* ── PROFILE ── */}
      {section === "profile" && (
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
            <button className="flex items-center gap-2 px-4 py-2.5 glass text-white/60 hover:text-white rounded-xl border border-white/10 hover:border-white/20 transition-all text-sm">
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
      )}

      {/* ── REQUISITES ── */}
      {section === "requisites" && (
        <div className="glass rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-oswald font-semibold text-white text-lg">Юридические реквизиты</h3>
            <button onClick={saveRequisites} disabled={reqSaving}
              className="flex items-center gap-2 px-4 py-2 bg-neon-purple text-white rounded-xl text-sm hover:opacity-90 disabled:opacity-50 transition-opacity">
              {reqSaving ? <Icon name="Loader2" size={14} className="animate-spin" /> : reqSaved ? <Icon name="Check" size={14} /> : <Icon name="Save" size={14} />}
              {reqSaved ? "Сохранено!" : "Сохранить"}
            </button>
          </div>

          {/* Тип организации */}
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">Организационная форма</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(COMPANY_LABELS) as [CompanyType, string][]).map(([val, label]) => (
                <button key={val} type="button" onClick={() => setReqForm(f => ({ ...f, companyType: val }))}
                  className={`py-2.5 px-3 rounded-xl border text-sm transition-all text-left ${reqForm.companyType === val ? "bg-neon-cyan/15 border-neon-cyan/50 text-neon-cyan" : "glass border-white/10 text-white/50 hover:border-white/25 hover:text-white"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {reqForm.companyType !== "individual" && (
            <>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Полное наименование</label>
                <input value={reqForm.legalName} onChange={e => setReqForm(f => ({ ...f, legalName: e.target.value }))}
                  placeholder={reqForm.companyType === "ip" ? "ИП Иванов Иван Иванович" : 'ООО "Название"'}
                  className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-cyan/50 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">ИНН</label>
                  <input value={reqForm.inn} onChange={e => setReqForm(f => ({ ...f, inn: e.target.value.replace(/\D/g,"") }))}
                    placeholder="10 или 12 цифр" maxLength={12}
                    className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-cyan/50 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">КПП</label>
                  <input value={reqForm.kpp} onChange={e => setReqForm(f => ({ ...f, kpp: e.target.value.replace(/\D/g,"") }))}
                    placeholder="9 цифр (для ООО)" maxLength={9}
                    className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-cyan/50 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">ОГРН / ОГРНИП</label>
                <input value={reqForm.ogrn} onChange={e => setReqForm(f => ({ ...f, ogrn: e.target.value.replace(/\D/g,"") }))}
                  placeholder="13–15 цифр" maxLength={15}
                  className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-cyan/50 text-sm" />
              </div>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Юридический адрес</label>
                <input value={reqForm.legalAddress} onChange={e => setReqForm(f => ({ ...f, legalAddress: e.target.value }))}
                  placeholder="г. Москва, ул. Ленина, д. 1"
                  className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-cyan/50 text-sm" />
              </div>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Фактический адрес</label>
                <input value={reqForm.actualAddress} onChange={e => setReqForm(f => ({ ...f, actualAddress: e.target.value }))}
                  placeholder="Если отличается от юридического"
                  className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-cyan/50 text-sm" />
              </div>
              <div className="h-px bg-white/10" />
              <p className="text-xs text-white/40 uppercase tracking-wider">Банковские реквизиты</p>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Банк</label>
                <input value={reqForm.bankName} onChange={e => setReqForm(f => ({ ...f, bankName: e.target.value }))}
                  placeholder="ПАО Сбербанк"
                  className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-cyan/50 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Расчётный счёт</label>
                  <input value={reqForm.bankAccount} onChange={e => setReqForm(f => ({ ...f, bankAccount: e.target.value.replace(/\D/g,"") }))}
                    placeholder="20 цифр" maxLength={20}
                    className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-cyan/50 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">БИК</label>
                  <input value={reqForm.bankBik} onChange={e => setReqForm(f => ({ ...f, bankBik: e.target.value.replace(/\D/g,"") }))}
                    placeholder="9 цифр" maxLength={9}
                    className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-cyan/50 text-sm" />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Телефон</label>
            <input value={reqForm.phone} onChange={e => setReqForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="+7 999 000 00 00"
              className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-cyan/50 text-sm" />
          </div>
        </div>
      )}

      {/* ── LOGO ── */}
      {section === "logo" && (
        <div className="glass rounded-2xl p-6 space-y-5">
          <h3 className="font-oswald font-semibold text-white text-lg mb-1">Логотип компании</h3>
          <p className="text-white/40 text-sm">Логотип отображается в личном кабинете, экспортируемых отчётах и карточке площадки.</p>

          <div className="flex items-start gap-6">
            <div className="shrink-0">
              {logoPreview ? (
                <img src={logoPreview} alt="logo" className="w-24 h-24 rounded-2xl object-cover border border-white/10" />
              ) : (
                <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${user.avatarColor} flex items-center justify-center font-oswald font-bold text-3xl text-white border border-white/10`}>
                  {user.avatar}
                </div>
              )}
            </div>
            <div className="flex-1 space-y-3">
              <label className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-white/15 hover:border-white/30 cursor-pointer transition-colors">
                <Icon name="ImagePlus" size={20} className="text-white/30" />
                <div>
                  <p className="text-white/50 text-sm">Загрузить логотип</p>
                  <p className="text-white/25 text-xs">PNG, JPG, SVG · рекомендуем 400×400</p>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              </label>
              {logoFile && (
                <button onClick={saveLogo} disabled={logoSaving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 text-sm">
                  {logoSaving ? <><Icon name="Loader2" size={15} className="animate-spin" />Загружаем...</> : <><Icon name="Upload" size={15} />Сохранить логотип</>}
                </button>
              )}
              {user.logoUrl && !logoFile && (
                <button onClick={() => onProfileUpdate?.({ logoUrl: "" })}
                  className="flex items-center gap-2 text-neon-pink text-sm hover:text-white transition-colors">
                  <Icon name="Trash2" size={13} />Удалить логотип
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── EMPLOYEES ── */}
      {section === "employees" && (
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

          {/* Форма добавления */}
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
              {empError && <p className="text-neon-pink text-xs flex items-center gap-1"><Icon name="AlertCircle" size={12}/>{empError}</p>}
              <div className="flex gap-2">
                <button onClick={() => { setShowAddEmp(false); setEmpError(""); }} className="flex-1 py-2 glass text-white/50 rounded-xl border border-white/10 text-sm hover:text-white">Отмена</button>
                <button onClick={addEmployee} disabled={empSaving}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-neon-purple text-white rounded-xl text-sm hover:opacity-90 disabled:opacity-50">
                  {empSaving ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="UserPlus" size={14} />}Добавить
                </button>
              </div>
            </div>
          )}

          {/* Список */}
          {empLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="glass rounded-2xl h-16 animate-pulse" />)}</div>
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
      )}
    </div>
  );
}
