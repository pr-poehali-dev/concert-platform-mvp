import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";
import {
  MAIL_URL, formatMailDate,
  type MailAccount, type MailListItem, type MailFull,
} from "./mail/mailTypes";
import MailAccountModal from "./mail/MailAccountModal";
import MailComposeModal from "./mail/MailComposeModal";

const FOLDER_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  INBOX:    { label: "Входящие",   icon: "Inbox",       color: "text-neon-purple" },
  Sent:     { label: "Отправленные", icon: "Send",     color: "text-neon-cyan" },
  Drafts:   { label: "Черновики",  icon: "FileEdit",    color: "text-white/65" },
  Spam:     { label: "Спам",       icon: "ShieldAlert", color: "text-neon-pink" },
  Trash:    { label: "Корзина",    icon: "Trash2",      color: "text-white/55" },
};

function folderInfo(name: string) {
  // Совпадение по разным регистрам и стандартным названиям
  const upper = name.toUpperCase();
  if (upper === "INBOX")                   return FOLDER_LABELS.INBOX;
  if (upper.includes("SENT"))              return FOLDER_LABELS.Sent;
  if (upper.includes("DRAFT"))             return FOLDER_LABELS.Drafts;
  if (upper.includes("SPAM") || upper.includes("JUNK")) return FOLDER_LABELS.Spam;
  if (upper.includes("TRASH") || upper.includes("DELETE")) return FOLDER_LABELS.Trash;
  return { label: name, icon: "Folder", color: "text-white/65" };
}

export default function MailPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<MailAccount[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [folders, setFolders] = useState<string[]>(["INBOX"]);
  const [activeFolder, setActiveFolder] = useState("INBOX");
  const [messages, setMessages] = useState<MailListItem[]>([]);
  const [openMail, setOpenMail] = useState<MailFull | null>(null);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingMail, setLoadingMail] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [composeInitial, setComposeInitial] = useState<{ to?: string; subject?: string; text?: string }>();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 40;

  const activeAccount = accounts.find(a => a.id === activeAccountId);

  const loadAccounts = useCallback(async () => {
    if (!user) return;
    setLoadingAccounts(true);
    try {
      const res = await fetch(`${MAIL_URL}?action=accounts&user_id=${user.id}`);
      const data = await res.json();
      const acts: MailAccount[] = (data.accounts || []).filter((a: MailAccount) => a.isActive);
      setAccounts(acts);
      if (acts.length > 0 && !activeAccountId) setActiveAccountId(acts[0].id);
    } catch {
      setAccounts([]);
    } finally {
      setLoadingAccounts(false);
    }
  }, [user, activeAccountId]);

  const loadFolders = useCallback(async (accId: string) => {
    try {
      const res = await fetch(`${MAIL_URL}?action=folders&account_id=${accId}`);
      const data = await res.json();
      const fs: string[] = data.folders || ["INBOX"];
      setFolders(fs);
      if (!fs.includes(activeFolder)) setActiveFolder(fs[0] || "INBOX");
    } catch { /* silent */ }
  }, [activeFolder]);

  const loadList = useCallback(async (accId: string, folder: string, q: string = "") => {
    setLoadingList(true);
    setMessages([]);
    setHasMore(false);
    setTotalCount(0);
    try {
      const url = `${MAIL_URL}?action=list&account_id=${accId}&folder=${encodeURIComponent(folder)}&limit=${PAGE_SIZE}&offset=0${q ? `&q=${encodeURIComponent(q)}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      setMessages(data.messages || []);
      setHasMore(!!data.hasMore);
      setTotalCount(data.total || 0);
    } catch {
      setMessages([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!activeAccountId || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const offset = messages.length;
      const url = `${MAIL_URL}?action=list&account_id=${activeAccountId}&folder=${encodeURIComponent(activeFolder)}&limit=${PAGE_SIZE}&offset=${offset}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      const next: MailListItem[] = data.messages || [];
      // Дедупликация по uid (на случай прихода нового письма во время пагинации)
      setMessages(prev => {
        const seen = new Set(prev.map(m => m.uid));
        return [...prev, ...next.filter(m => !seen.has(m.uid))];
      });
      setHasMore(!!data.hasMore);
    } catch { /* silent */ }
    finally { setLoadingMore(false); }
  }, [activeAccountId, activeFolder, messages.length, hasMore, loadingMore, searchQuery]);

  const openMessage = async (uid: string) => {
    if (!activeAccountId) return;
    setLoadingMail(true);
    setOpenMail(null);
    try {
      const res = await fetch(`${MAIL_URL}?action=read&account_id=${activeAccountId}&folder=${encodeURIComponent(activeFolder)}&uid=${uid}`);
      const data = await res.json();
      if (res.ok) {
        setOpenMail(data);
        setMessages(prev => prev.map(m => m.uid === uid ? { ...m, isRead: true } : m));
      }
    } catch { /* silent */ }
    finally { setLoadingMail(false); }
  };

  const deleteAccount = async (accId: string) => {
    if (!user) return;
    if (!confirm("Отключить этот почтовый аккаунт?")) return;
    await fetch(`${MAIL_URL}?action=delete_account`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: accId, userId: user.id }),
    });
    if (activeAccountId === accId) {
      setActiveAccountId(null);
      setMessages([]);
      setOpenMail(null);
    }
    loadAccounts();
  };

  useEffect(() => { loadAccounts(); }, [loadAccounts]);
  useEffect(() => {
    if (activeAccountId) {
      loadFolders(activeAccountId);
      loadList(activeAccountId, activeFolder, searchQuery);
    }
  }, [activeAccountId]);
  useEffect(() => {
    if (activeAccountId && activeFolder) loadList(activeAccountId, activeFolder, searchQuery);
  }, [activeFolder, searchQuery]);

  // Debounce поискового ввода
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // ─── Состояние: нет аккаунтов ───
  if (loadingAccounts) {
    return (
      <div className="min-h-screen pt-2 flex items-center justify-center">
        <Icon name="Loader2" size={28} className="text-neon-purple animate-spin" />
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="min-h-screen pt-2 pb-20 max-w-2xl mx-auto px-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-neon-purple/15 border border-neon-purple/25 flex items-center justify-center">
            <Icon name="Mail" size={20} className="text-neon-purple" />
          </div>
          <div>
            <h1 className="font-oswald font-bold text-2xl text-white uppercase leading-none">Почта</h1>
            <p className="text-white/45 text-xs mt-0.5">Полноценный IMAP/SMTP клиент</p>
          </div>
        </div>

        <div className="glass rounded-2xl border border-white/10 p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-purple/20 to-neon-cyan/20 border border-neon-purple/20 flex items-center justify-center mx-auto mb-4">
            <Icon name="MailPlus" size={28} className="text-neon-purple" />
          </div>
          <h2 className="font-oswald font-bold text-xl text-white mb-2">Подключите почтовый ящик</h2>
          <p className="text-white/55 text-sm mb-5 max-w-md mx-auto">
            Читайте и отправляйте письма прямо в платформе. Поддерживаются Яндекс, Gmail, Mail.ru, Outlook и другие IMAP/SMTP-серверы.
          </p>
          <button
            onClick={() => setShowAdd(true)}
            className="px-6 py-2.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-lg text-sm inline-flex items-center gap-2"
          >
            <Icon name="Plus" size={16} />
            Подключить почту
          </button>
        </div>

        {showAdd && <MailAccountModal onClose={() => setShowAdd(false)} onAdded={loadAccounts} />}
      </div>
    );
  }

  // ─── Основной интерфейс ───
  return (
    <div className="min-h-screen pt-2 pb-2">
      <div className="max-w-7xl mx-auto px-4">
        {/* Шапка */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-neon-purple/15 border border-neon-purple/25 flex items-center justify-center">
              <Icon name="Mail" size={20} className="text-neon-purple" />
            </div>
            <div>
              <h1 className="font-oswald font-bold text-2xl text-white uppercase leading-none">Почта</h1>
              <div className="flex items-center gap-2 mt-1">
                <select
                  value={activeAccountId || ""}
                  onChange={e => setActiveAccountId(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded text-white/75 text-xs px-2 py-0.5 outline-none"
                >
                  {accounts.map(a => <option key={a.id} value={a.id} className="bg-[#141722]">{a.email}</option>)}
                </select>
                <button onClick={() => setShowAdd(true)} className="text-white/55 hover:text-white text-xs flex items-center gap-1">
                  <Icon name="Plus" size={11} /> Ещё аккаунт
                </button>
                {activeAccount && (
                  <button onClick={() => deleteAccount(activeAccount.id)} className="text-white/45 hover:text-neon-pink text-xs flex items-center gap-1" title="Отключить">
                    <Icon name="Unplug" size={11} />
                  </button>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => { setComposeInitial(undefined); setShowCompose(true); }}
            className="px-4 py-2 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-lg text-sm flex items-center gap-2"
          >
            <Icon name="Edit" size={14} /> Написать
          </button>
        </div>

        <div className="grid grid-cols-12 gap-3 h-[calc(100vh-9rem)]">
          {/* Папки */}
          <aside className="col-span-12 sm:col-span-3 lg:col-span-2 glass rounded-xl border border-white/10 p-2 overflow-y-auto scrollbar-thin">
            <p className="text-white/45 text-[10px] uppercase tracking-wider px-2 py-1 font-bold">Папки</p>
            {folders.map(f => {
              const info = folderInfo(f);
              const active = activeFolder === f;
              return (
                <button
                  key={f}
                  onClick={() => { setActiveFolder(f); setOpenMail(null); }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all ${
                    active ? "bg-neon-purple/20 text-white border border-neon-purple/30"
                           : "text-white/65 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon name={info.icon as never} size={14} className={active ? "text-neon-purple" : info.color} />
                  <span className="flex-1 text-left truncate">{info.label}</span>
                </button>
              );
            })}
          </aside>

          {/* Список писем */}
          <section
            className="col-span-12 sm:col-span-9 lg:col-span-4 glass rounded-xl border border-white/10 overflow-y-auto scrollbar-thin flex flex-col"
            onScroll={(e) => {
              const el = e.currentTarget;
              if (hasMore && !loadingMore && (el.scrollHeight - el.scrollTop - el.clientHeight < 200)) {
                loadMore();
              }
            }}
          >
            {/* Поиск */}
            <div className="sticky top-0 bg-[var(--glass-strong-bg,#13131f)]/80 backdrop-blur-md border-b border-white/8 px-2 py-2 z-10">
              <div className="flex items-center gap-2 px-2 py-1.5 bg-white/5 rounded-lg border border-white/10">
                <Icon name="Search" size={14} className="text-white/45 shrink-0" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder={`Поиск ${searchQuery ? "..." : "по теме, отправителю, тексту"}`}
                  className="flex-1 bg-transparent text-white text-xs outline-none placeholder:text-white/30 min-w-0"
                />
                {searchInput && (
                  <button
                    onClick={() => { setSearchInput(""); setSearchQuery(""); }}
                    className="text-white/45 hover:text-white shrink-0"
                  >
                    <Icon name="X" size={12} />
                  </button>
                )}
              </div>
              {searchQuery && (
                <p className="text-white/40 text-[10px] mt-1.5 px-1">
                  Найдено: {totalCount} {totalCount === 1 ? "письмо" : totalCount < 5 ? "письма" : "писем"}
                </p>
              )}
            </div>

            {loadingList ? (
              <div className="flex justify-center py-10">
                <Icon name="Loader2" size={20} className="text-white/40 animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-16 text-white/40 text-sm">
                <Icon name="MailX" size={28} className="mx-auto mb-2 text-white/25" />
                {searchQuery ? "Ничего не найдено" : "Нет писем"}
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {messages.map(m => (
                  <button
                    key={m.uid}
                    onClick={() => openMessage(m.uid)}
                    className={`w-full text-left px-3 py-2.5 hover:bg-white/5 transition-colors ${
                      openMail?.uid === m.uid ? "bg-neon-purple/10" : ""
                    } ${!m.isRead ? "border-l-2 border-neon-purple" : "border-l-2 border-transparent"}`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className={`text-sm truncate ${!m.isRead ? "text-white font-bold" : "text-white/80"}`}>
                        {m.fromName || m.fromEmail}
                      </span>
                      <span className="text-[10px] text-white/35 shrink-0">{formatMailDate(m.date)}</span>
                    </div>
                    <p className={`text-xs truncate ${!m.isRead ? "text-white/85 font-semibold" : "text-white/55"}`}>
                      {m.subject || "(без темы)"}
                    </p>
                  </button>
                ))}
                {/* Подгрузка следующей страницы */}
                {hasMore && (
                  <div className="px-3 py-3 text-center">
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="text-neon-purple hover:text-white text-xs font-semibold flex items-center gap-1.5 mx-auto disabled:opacity-50"
                    >
                      {loadingMore ? (
                        <><Icon name="Loader2" size={12} className="animate-spin" /> Загрузка...</>
                      ) : (
                        <><Icon name="ChevronDown" size={12} /> Показать ещё</>
                      )}
                    </button>
                  </div>
                )}
                {!hasMore && messages.length >= PAGE_SIZE && (
                  <p className="text-center text-white/30 text-[10px] py-3">Это все письма ({totalCount})</p>
                )}
              </div>
            )}
          </section>

          {/* Просмотр письма */}
          <article className="hidden lg:flex lg:col-span-6 glass rounded-xl border border-white/10 overflow-hidden flex-col">
            {loadingMail ? (
              <div className="flex-1 flex items-center justify-center">
                <Icon name="Loader2" size={20} className="text-white/40 animate-spin" />
              </div>
            ) : !openMail ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-white/40 px-6">
                <Icon name="MailOpen" size={32} className="mb-3 text-white/25" />
                <p className="text-sm">Выберите письмо</p>
              </div>
            ) : (
              <>
                <div className="p-4 border-b border-white/10">
                  <h2 className="font-oswald font-bold text-xl text-white mb-2">{openMail.subject || "(без темы)"}</h2>
                  <div className="flex items-start gap-2 text-xs">
                    <span className="text-white/45 w-12 shrink-0">От:</span>
                    <span className="text-white/85">
                      {openMail.fromName ? `${openMail.fromName} ` : ""}
                      <span className="text-white/55">&lt;{openMail.fromEmail}&gt;</span>
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-xs mt-1">
                    <span className="text-white/45 w-12 shrink-0">Кому:</span>
                    <span className="text-white/75 truncate">{openMail.to}</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs mt-1">
                    <span className="text-white/45 w-12 shrink-0">Дата:</span>
                    <span className="text-white/75">{openMail.date ? new Date(openMail.date).toLocaleString("ru") : ""}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => {
                        setComposeInitial({
                          to: openMail.fromEmail,
                          subject: openMail.subject.startsWith("Re:") ? openMail.subject : `Re: ${openMail.subject}`,
                          text: `\n\n--- Исходное письмо ---\nОт: ${openMail.fromName} <${openMail.fromEmail}>\n\n${openMail.text}`,
                        });
                        setShowCompose(true);
                      }}
                      className="px-3 py-1.5 bg-neon-purple/15 hover:bg-neon-purple/25 text-neon-purple rounded-lg text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Icon name="Reply" size={12} /> Ответить
                    </button>
                    {openMail.attachments.length > 0 && (
                      <span className="text-white/55 text-xs flex items-center gap-1">
                        <Icon name="Paperclip" size={12} />
                        {openMail.attachments.length} вложен.
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
                  {openMail.html ? (
                    <iframe
                      srcDoc={openMail.html}
                      sandbox="allow-same-origin"
                      className="w-full min-h-[400px] bg-white rounded-lg"
                      title="email"
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap text-white/85 text-sm font-sans break-words">
                      {openMail.text || "(пусто)"}
                    </pre>
                  )}

                  {openMail.attachments.length > 0 && (
                    <div className="mt-4 space-y-1">
                      {openMail.attachments.map((a, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg text-xs">
                          <Icon name="Paperclip" size={12} className="text-white/55" />
                          <span className="text-white/85 truncate flex-1">{a.name}</span>
                          <span className="text-white/45">{Math.round(a.size / 1024)} КБ</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </article>
        </div>
      </div>

      {showAdd && <MailAccountModal onClose={() => setShowAdd(false)} onAdded={loadAccounts} />}
      {showCompose && activeAccount && (
        <MailComposeModal
          account={activeAccount}
          initial={composeInitial}
          onClose={() => setShowCompose(false)}
          onSent={() => activeAccountId && loadList(activeAccountId, activeFolder)}
        />
      )}
    </div>
  );
}