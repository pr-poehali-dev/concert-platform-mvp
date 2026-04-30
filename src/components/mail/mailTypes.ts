export const MAIL_URL = "https://functions.poehali.dev/d6b28aef-2d6a-48bc-a6c5-d915f12c0848";

export interface MailAccount {
  id: string;
  email: string;
  displayName: string;
  imapHost: string;
  smtpHost: string;
  isActive: boolean;
  createdAt: string;
}

export interface MailListItem {
  uid: string;
  subject: string;
  fromName: string;
  fromEmail: string;
  date: string;
  isRead: boolean;
}

export interface MailFull extends MailListItem {
  to: string;
  text: string;
  html: string;
  attachments: { name: string; size: number; mime: string }[];
}

/** Готовые пресеты для популярных провайдеров */
export const MAIL_PRESETS: Array<{
  id: string;
  label: string;
  domains: string[];
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  hint?: string;
}> = [
  {
    id: "yandex",
    label: "Яндекс.Почта",
    domains: ["yandex.ru", "yandex.com", "ya.ru"],
    imapHost: "imap.yandex.ru",
    imapPort: 993,
    smtpHost: "smtp.yandex.ru",
    smtpPort: 465,
    hint: "Нужен пароль приложения: id.yandex.ru → Безопасность → Пароли приложений",
  },
  {
    id: "gmail",
    label: "Gmail",
    domains: ["gmail.com", "googlemail.com"],
    imapHost: "imap.gmail.com",
    imapPort: 993,
    smtpHost: "smtp.gmail.com",
    smtpPort: 465,
    hint: "Нужен пароль приложения: myaccount.google.com → Безопасность → Пароли приложений",
  },
  {
    id: "mail",
    label: "Mail.ru",
    domains: ["mail.ru", "bk.ru", "list.ru", "inbox.ru"],
    imapHost: "imap.mail.ru",
    imapPort: 993,
    smtpHost: "smtp.mail.ru",
    smtpPort: 465,
    hint: "Включите доступ по IMAP в настройках Mail.ru и создайте пароль приложения",
  },
  {
    id: "outlook",
    label: "Outlook / Office 365",
    domains: ["outlook.com", "hotmail.com", "live.com", "office365.com"],
    imapHost: "outlook.office365.com",
    imapPort: 993,
    smtpHost: "smtp.office365.com",
    smtpPort: 587,
  },
  {
    id: "custom",
    label: "Другой провайдер",
    domains: [],
    imapHost: "",
    imapPort: 993,
    smtpHost: "",
    smtpPort: 465,
  },
];

export function detectPreset(email: string) {
  const domain = email.toLowerCase().split("@")[1] || "";
  for (const p of MAIL_PRESETS) {
    if (p.domains.includes(domain)) return p;
  }
  return MAIL_PRESETS[MAIL_PRESETS.length - 1]; // custom
}

export function formatMailDate(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays < 7) return d.toLocaleDateString("ru", { weekday: "short" });
  if (now.getFullYear() === d.getFullYear()) return d.toLocaleDateString("ru", { day: "numeric", month: "short" });
  return d.toLocaleDateString("ru", { day: "numeric", month: "short", year: "numeric" });
}
