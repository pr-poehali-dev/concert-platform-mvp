import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";
import {
  MAIL_URL,
  type MailAccount, type MailListItem, type MailFull,
} from "./mail/mailTypes";
import MailAccountModal from "./mail/MailAccountModal";
import MailComposeModal from "./mail/MailComposeModal";
import MailFolderSidebar from "./mail/MailFolderSidebar";
import MailMessageList from "./mail/MailMessageList";
import MailMessageView from "./mail/MailMessageView";

const PAGE_SIZE = 40;

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
  const [filterUnread, setFilterUnread] = useState(false);
  const [filterAttach, setFilterAttach] = useState(false);
  const [selectedUids, setSelectedUids] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [dragUids, setDragUids] = useState<string[]>([]);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);

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

  const buildListUrl = (accId: string, folder: string, q: string, offset: number) => {
    const parts = [
      `action=list`,
      `account_id=${accId}`,
      `folder=${encodeURIComponent(folder)}`,
      `limit=${PAGE_SIZE}`,
      `offset=${offset}`,
    ];
    if (q) parts.push(`q=${encodeURIComponent(q)}`);
    if (filterUnread) parts.push(`filter_unread=1`);
    if (filterAttach) parts.push(`filter_attach=1`);
    return `${MAIL_URL}?${parts.join("&")}`;
  };

  const loadList = useCallback(async (accId: string, folder: string, q: string = "") => {
    setLoadingList(true);
    setMessages([]);
    setHasMore(false);
    setTotalCount(0);
    setSelectedUids(new Set());
    try {
      const res = await fetch(buildListUrl(accId, folder, q, 0));
      const data = await res.json();
      setMessages(data.messages || []);
      setHasMore(!!data.hasMore);
      setTotalCount(data.total || 0);
    } catch {
      setMessages([]);
    } finally {
      setLoadingList(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterUnread, filterAttach]);

  const loadMore = useCallback(async () => {
    if (!activeAccountId || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const offset = messages.length;
      const res = await fetch(buildListUrl(activeAccountId, activeFolder, searchQuery, offset));
      const data = await res.json();
      const next: MailListItem[] = data.messages || [];
      setMessages(prev => {
        const seen = new Set(prev.map(m => m.uid));
        return [...prev, ...next.filter(m => !seen.has(m.uid))];
      });
      setHasMore(!!data.hasMore);
    } catch { /* silent */ }
    finally { setLoadingMore(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAccountId, activeFolder, messages.length, hasMore, loadingMore, searchQuery, filterUnread, filterAttach]);

  // ── Массовые действия ─────────────────────────────────────────────────
  const toggleSelect = (uid: string) => {
    setSelectedUids(prev => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const selectAllVisible = () => {
    if (selectedUids.size === messages.length) {
      setSelectedUids(new Set());
    } else {
      setSelectedUids(new Set(messages.map(m => m.uid)));
    }
  };

  const bulkMarkRead = async (isRead: boolean) => {
    if (!activeAccountId || selectedUids.size === 0) return;
    setBulkLoading(true);
    try {
      await fetch(`${MAIL_URL}?action=mark_read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: activeAccountId,
          folder: activeFolder,
          uids: Array.from(selectedUids),
          isRead,
        }),
      });
      const sel = selectedUids;
      setMessages(prev => prev.map(m => sel.has(m.uid) ? { ...m, isRead } : m));
      setSelectedUids(new Set());
    } finally { setBulkLoading(false); }
  };

  const bulkDelete = async () => {
    if (!activeAccountId || selectedUids.size === 0) return;
    if (!confirm(`Удалить ${selectedUids.size} писем(а)?`)) return;
    setBulkLoading(true);
    try {
      await fetch(`${MAIL_URL}?action=delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: activeAccountId,
          folder: activeFolder,
          uids: Array.from(selectedUids),
        }),
      });
      const sel = selectedUids;
      setMessages(prev => prev.filter(m => !sel.has(m.uid)));
      setSelectedUids(new Set());
      if (openMail && sel.has(openMail.uid)) setOpenMail(null);
    } finally { setBulkLoading(false); }
  };

  const bulkMove = async (target: string) => {
    if (!activeAccountId || selectedUids.size === 0) return;
    setBulkLoading(true);
    try {
      await fetch(`${MAIL_URL}?action=move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: activeAccountId,
          folder: activeFolder,
          target,
          uids: Array.from(selectedUids),
        }),
      });
      const sel = selectedUids;
      setMessages(prev => prev.filter(m => !sel.has(m.uid)));
      setSelectedUids(new Set());
      if (openMail && sel.has(openMail.uid)) setOpenMail(null);
    } finally { setBulkLoading(false); }
  };

  const swipeDelete = async (uid: string) => {
    if (!activeAccountId) return;
    await fetch(`${MAIL_URL}?action=delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId: activeAccountId, folder: activeFolder, uids: [uid] }),
    });
    setMessages(prev => prev.filter(m => m.uid !== uid));
    if (openMail?.uid === uid) setOpenMail(null);
  };

  const swipeArchive = async (uid: string) => {
    if (!activeAccountId) return;
    const target = folders.find(f => /archive|архив|all.?mail/i.test(f)) || "Trash";
    await fetch(`${MAIL_URL}?action=move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId: activeAccountId, folder: activeFolder, target, uids: [uid] }),
    });
    setMessages(prev => prev.filter(m => m.uid !== uid));
    if (openMail?.uid === uid) setOpenMail(null);
  };

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

  const handleDropFolder = async (targetFolder: string, uids: string[]) => {
    if (!activeAccountId) return;
    setBulkLoading(true);
    try {
      await fetch(`${MAIL_URL}?action=move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: activeAccountId,
          folder: activeFolder,
          target: targetFolder,
          uids,
        }),
      });
      const moved = new Set(uids);
      setMessages(prev => prev.filter(m => !moved.has(m.uid)));
      setSelectedUids(prev => { const n = new Set(prev); uids.forEach(u => n.delete(u)); return n; });
      if (openMail && moved.has(openMail.uid)) setOpenMail(null);
    } finally {
      setBulkLoading(false);
      setDragUids([]);
    }
  };

  const handleDragStart = (e: React.DragEvent, uid: string, subject: string) => {
    const uids = selectedUids.size > 0 && selectedUids.has(uid)
      ? Array.from(selectedUids)
      : [uid];
    setDragUids(uids);
    const ghost = document.createElement("div");
    ghost.style.cssText = "position:fixed;top:-999px;left:-999px;padding:6px 10px;background:#6c3bff;color:#fff;border-radius:8px;font-size:12px;font-weight:600;white-space:nowrap;pointer-events:none;";
    ghost.textContent = uids.length > 1 ? `${uids.length} писем` : (subject || "(без темы)").slice(0, 32);
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    setTimeout(() => document.body.removeChild(ghost), 0);
    e.dataTransfer.effectAllowed = "move";
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFolder, searchQuery, filterUnread, filterAttach]);

  // Debounce поискового ввода
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // ─── Состояние: загрузка ───
  if (loadingAccounts) {
    return (
      <div className="min-h-screen pt-2 flex items-center justify-center">
        <Icon name="Loader2" size={28} className="text-neon-purple animate-spin" />
      </div>
    );
  }

  // ─── Состояние: нет аккаунтов ───
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
          <MailFolderSidebar
            folders={folders}
            activeFolder={activeFolder}
            dragUids={dragUids}
            dragOverFolder={dragOverFolder}
            activeAccountId={activeAccountId}
            onSelectFolder={(f) => { setActiveFolder(f); setOpenMail(null); }}
            onDragOverFolder={setDragOverFolder}
            onDropFolder={handleDropFolder}
            onDragEnd={() => setDragUids([])}
          />

          <MailMessageList
            messages={messages}
            openMail={openMail}
            loadingList={loadingList}
            loadingMore={loadingMore}
            hasMore={hasMore}
            totalCount={totalCount}
            searchQuery={searchQuery}
            searchInput={searchInput}
            filterUnread={filterUnread}
            filterAttach={filterAttach}
            selectedUids={selectedUids}
            bulkLoading={bulkLoading}
            dragUids={dragUids}
            activeFolder={activeFolder}
            onScrollLoad={loadMore}
            onLoadMore={loadMore}
            onSearchInput={setSearchInput}
            onClearSearch={() => { setSearchInput(""); setSearchQuery(""); }}
            onToggleFilterUnread={() => setFilterUnread(v => !v)}
            onToggleFilterAttach={() => setFilterAttach(v => !v)}
            onSelectAllVisible={selectAllVisible}
            onBulkMarkRead={bulkMarkRead}
            onBulkMove={bulkMove}
            onBulkDelete={bulkDelete}
            onClearSelection={() => setSelectedUids(new Set())}
            onOpenMessage={openMessage}
            onToggleSelect={toggleSelect}
            onSwipeDelete={swipeDelete}
            onSwipeArchive={swipeArchive}
            onDragStart={handleDragStart}
            onDragEnd={() => setDragUids([])}
          />

          <MailMessageView
            openMail={openMail}
            loadingMail={loadingMail}
            onReply={() => {
              if (!openMail) return;
              setComposeInitial({
                to: openMail.fromEmail,
                subject: openMail.subject.startsWith("Re:") ? openMail.subject : `Re: ${openMail.subject}`,
                text: `\n\n--- Исходное письмо ---\nОт: ${openMail.fromName} <${openMail.fromEmail}>\n\n${openMail.text}`,
              });
              setShowCompose(true);
            }}
          />
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
