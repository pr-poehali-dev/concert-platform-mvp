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

export interface MailPresetStep {
  text: string;
  url?: string;
  urlLabel?: string;
  warn?: boolean;
}

/** Готовые пресеты для популярных провайдеров */
export const MAIL_PRESETS: Array<{
  id: string;
  label: string;
  logo: string;
  domains: string[];
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  hint?: string;
  passwordLabel: string;
  steps: MailPresetStep[];
}> = [
  {
    id: "yandex",
    label: "Яндекс.Почта",
    logo: "🟡",
    domains: ["yandex.ru", "yandex.com", "ya.ru"],
    imapHost: "imap.yandex.ru",
    imapPort: 993,
    smtpHost: "smtp.yandex.ru",
    smtpPort: 465,
    hint: "Используйте пароль приложения — не основной пароль от Яндекс ID",
    passwordLabel: "Пароль приложения",
    steps: [
      { text: "Откройте настройки Яндекс ID", url: "https://id.yandex.ru/security", urlLabel: "id.yandex.ru/security" },
      { text: "Перейдите в раздел «Безопасность»" },
      { text: "Прокрутите вниз до блока «Пароли приложений» и нажмите «Создать новый пароль»" },
      { text: "Выберите тип «Почта», дайте название (например: Global Link) и нажмите «Создать»" },
      { text: "Скопируйте сгенерированный пароль — он показывается только один раз", warn: true },
      { text: "Также убедитесь что в настройках Яндекс.Почты включён доступ по IMAP: Настройки → Почтовые клиенты → IMAP", url: "https://mail.yandex.ru/#setup/client", urlLabel: "mail.yandex.ru → Настройки" },
    ],
  },
  {
    id: "gmail",
    label: "Gmail",
    logo: "🔴",
    domains: ["gmail.com", "googlemail.com"],
    imapHost: "imap.gmail.com",
    imapPort: 993,
    smtpHost: "smtp.gmail.com",
    smtpPort: 465,
    hint: "Для Gmail требуется включить двухэтапную аутентификацию и создать пароль приложения",
    passwordLabel: "Пароль приложения",
    steps: [
      { text: "Откройте настройки аккаунта Google", url: "https://myaccount.google.com/security", urlLabel: "myaccount.google.com/security" },
      { text: "В разделе «Вход в Google» убедитесь, что включена двухэтапная аутентификация (без неё пароли приложений недоступны)", warn: true },
      { text: "Перейдите в раздел «Пароли приложений» (внизу страницы Безопасность)", url: "https://myaccount.google.com/apppasswords", urlLabel: "myaccount.google.com/apppasswords" },
      { text: "В поле «Название» введите: Global Link, нажмите «Создать»" },
      { text: "Скопируйте 16-значный пароль — он показывается только один раз", warn: true },
      { text: "Также проверьте что IMAP включён: Gmail → Настройки → Все настройки → Пересылка и POP/IMAP → Включить IMAP", url: "https://mail.google.com/mail/u/0/#settings/fwdandpop", urlLabel: "Gmail → Настройки → IMAP" },
    ],
  },
  {
    id: "mail",
    label: "Mail.ru",
    logo: "🔵",
    domains: ["mail.ru", "bk.ru", "list.ru", "inbox.ru"],
    imapHost: "imap.mail.ru",
    imapPort: 993,
    smtpHost: "smtp.mail.ru",
    smtpPort: 465,
    hint: "Включите доступ по паролям для внешних приложений в настройках безопасности",
    passwordLabel: "Пароль приложения",
    steps: [
      { text: "Откройте настройки почты Mail.ru", url: "https://account.mail.ru/user/security", urlLabel: "account.mail.ru/user/security" },
      { text: "Перейдите в раздел «Безопасность» → «Пароли для внешних приложений»" },
      { text: "Нажмите «Добавить», введите название: Global Link" },
      { text: "Скопируйте пароль — он показывается только один раз", warn: true },
      { text: "Убедитесь что IMAP включён: Настройки почты → Почтовые программы → Включить доступ по протоколу IMAP", url: "https://mail.ru/#setup", urlLabel: "Mail.ru → Настройки" },
    ],
  },
  {
    id: "outlook",
    label: "Outlook / Office 365",
    logo: "🔷",
    domains: ["outlook.com", "hotmail.com", "live.com", "office365.com"],
    imapHost: "outlook.office365.com",
    imapPort: 993,
    smtpHost: "smtp.office365.com",
    smtpPort: 587,
    hint: "Личные аккаунты Outlook поддерживают пароль приложения, корпоративные — зависят от политики администратора",
    passwordLabel: "Пароль приложения (или основной пароль)",
    steps: [
      { text: "Откройте настройки безопасности Microsoft", url: "https://account.microsoft.com/security", urlLabel: "account.microsoft.com/security" },
      { text: "Перейдите в «Расширенные параметры безопасности» → «Пароли приложений»" },
      { text: "Нажмите «Создать новый пароль приложения», скопируйте результат", warn: true },
      { text: "Для корпоративных аккаунтов Office 365 — используйте основной пароль, если администратор разрешил IMAP-доступ" },
      { text: "Проверьте что IMAP включён в настройках почтового ящика (для корп. аккаунтов — через admin.microsoft.com)", url: "https://outlook.live.com/mail/options/mail/accounts", urlLabel: "Outlook → Настройки" },
    ],
  },
  {
    id: "custom",
    label: "Другой провайдер",
    logo: "⚙️",
    domains: [],
    imapHost: "",
    imapPort: 993,
    smtpHost: "",
    smtpPort: 465,
    hint: "Уточните адреса IMAP/SMTP-серверов и порты в службе поддержки вашего почтового провайдера",
    passwordLabel: "Пароль",
    steps: [
      { text: "Обратитесь в службу поддержки провайдера или откройте справку по настройке почтовых клиентов" },
      { text: "Узнайте адреса и порты IMAP и SMTP серверов" },
      { text: "Если провайдер поддерживает пароли приложений — создайте отдельный пароль для Global Link", warn: true },
      { text: "Если нет — используйте основной пароль от почты" },
    ],
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