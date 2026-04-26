import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";
import SendToConversationModal from "@/components/chat/SendToConversationModal";

const DOCS_URL = "https://functions.poehali.dev/b805f044-ba82-4db5-a2a5-7a88dfbfce4a";

// Категории по ролям
const CATEGORIES_ORGANIZER = [
  { value: "technical_rider", label: "Технический райдер", icon: "Settings2", color: "text-neon-cyan" },
  { value: "domestic_rider",  label: "Бытовой райдер",     icon: "Coffee",    color: "text-neon-purple" },
  { value: "artist_contract", label: "Договор с артистом", icon: "FileText",  color: "text-neon-pink" },
  { value: "other",           label: "Прочее",             icon: "File",      color: "text-white/40" },
];

const CATEGORIES_VENUE = [
  { value: "technical_rider", label: "Технический райдер", icon: "Settings2",  color: "text-neon-cyan" },
  { value: "domestic_rider",  label: "Бытовой райдер",     icon: "Coffee",     color: "text-neon-purple" },
  { value: "venue_contract",  label: "Договор с площадкой",icon: "Building2",  color: "text-neon-pink" },
  { value: "other",           label: "Прочее",             icon: "File",       color: "text-white/40" },
];

const MIME_ICONS: Record<string, string> = {
  "application/pdf":   "FileText",
  "application/msword": "FileText",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "FileText",
  "application/vnd.ms-excel": "Table",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Table",
  "image/jpeg": "Image",
  "image/png":  "Image",
  "text/plain": "AlignLeft",
};

interface Doc {
  id: string;
  category: string;
  categoryLabel: string;
  name: string;
  fileUrl: string;
  fileSize: number;
  fileSizeHuman: string;
  mimeType: string;
  note: string;
  createdAt: string;
}

const SESSION_KEY = "tourlink_session";

export default function DashboardDocumentsTab() {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState("all");

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadModal, setUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState("other");
  const [uploadNote, setUploadNote] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(false);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Note edit
  const [editNoteId, setEditNoteId] = useState<string | null>(null);
  const [editNoteText, setEditNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Send to chat
  const [sendChatFile, setSendChatFile] = useState<{ url: string; name: string; size: number; mime: string } | null>(null);

  const isVenue = user?.role === "venue";
  const categories = isVenue ? CATEGORIES_VENUE : CATEGORIES_ORGANIZER;

  const session = () => localStorage.getItem(SESSION_KEY) || "";

  const loadDocs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${DOCS_URL}?action=list`, {
        headers: { "X-Session-Id": session() },
      });
      const data = await res.json();
      setDocs((data.documents || []).filter((d: Doc) => d.name !== "[удалён]"));
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { loadDocs(); }, []);

  // ── Upload ─────────────────────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) {
      setUploadError("Файл больше 20 МБ");
      return;
    }
    setUploadFile(f);
    setUploadError("");
    setUploadModal(true);
    // Reset input
    e.target.value = "";
  };

  const doUpload = async () => {
    if (!uploadFile) return;
    setUploadProgress(true);
    setUploadError("");
    try {
      const base64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(uploadFile);
      });

      const res = await fetch(`${DOCS_URL}?action=upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Id": session() },
        body: JSON.stringify({
          fileData:  base64,
          fileName:  uploadFile.name,
          mimeType:  uploadFile.type || "application/octet-stream",
          category:  uploadCategory,
          note:      uploadNote,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка загрузки");

      setDocs(prev => [data, ...prev]);
      setUploadModal(false);
      setUploadFile(null);
      setUploadNote("");
      setUploadCategory("other");
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setUploadProgress(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────
  const doDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await fetch(`${DOCS_URL}?action=delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Id": session() },
        body: JSON.stringify({ id: deleteId }),
      });
      setDocs(prev => prev.filter(d => d.id !== deleteId));
      setDeleteId(null);
    } catch { /* silent */ }
    finally { setDeleting(false); }
  };

  // ── Note ───────────────────────────────────────────────────────────────
  const saveNote = async () => {
    if (!editNoteId) return;
    setSavingNote(true);
    try {
      await fetch(`${DOCS_URL}?action=update_note`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Id": session() },
        body: JSON.stringify({ id: editNoteId, note: editNoteText }),
      });
      setDocs(prev => prev.map(d => d.id === editNoteId ? { ...d, note: editNoteText } : d));
      setEditNoteId(null);
    } catch { /* silent */ }
    finally { setSavingNote(false); }
  };

  // ── Helpers ────────────────────────────────────────────────────────────
  const catMeta = (cat: string) =>
    categories.find(c => c.value === cat) ?? { icon: "File", color: "text-white/40", label: "Прочее" };

  const mimeIcon = (mime: string) => MIME_ICONS[mime] || "File";

  const filtered = filterCat === "all" ? docs : docs.filter(d => d.category === filterCat);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("ru", { day: "numeric", month: "short", year: "numeric" });
    } catch { return iso; }
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-oswald font-bold text-xl text-white">Мои документы</h2>
          <p className="text-white/40 text-sm mt-0.5">
            {isVenue
              ? "Храните технические райдеры, договоры и другие файлы"
              : "Храните райдеры, договоры с артистами и другие файлы"}
          </p>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 transition-opacity whitespace-nowrap"
        >
          <Icon name="Upload" size={16} />
          Загрузить документ
        </button>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
          onChange={handleFileSelect}
        />
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1 glass rounded-xl p-1 w-fit">
        <button
          onClick={() => setFilterCat("all")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterCat === "all" ? "bg-neon-purple text-white" : "text-white/50 hover:text-white"}`}
        >
          Все ({docs.length})
        </button>
        {categories.map(c => {
          const cnt = docs.filter(d => d.category === c.value).length;
          return (
            <button
              key={c.value}
              onClick={() => setFilterCat(c.value)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterCat === c.value ? "bg-neon-purple text-white" : "text-white/50 hover:text-white"}`}
            >
              <Icon name={c.icon as never} size={13} />
              {c.label}
              {cnt > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${filterCat === c.value ? "bg-white/20" : "bg-white/10"}`}>
                  {cnt}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Icon name="Loader2" size={28} className="animate-spin text-neon-purple" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl border border-white/5 p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-neon-purple/10 flex items-center justify-center mx-auto mb-4">
            <Icon name="FolderOpen" size={28} className="text-neon-purple/50" />
          </div>
          <p className="text-white/50 font-medium mb-1">
            {filterCat === "all" ? "Документов пока нет" : "Нет документов этой категории"}
          </p>
          <p className="text-white/25 text-sm">
            Нажми «Загрузить документ» чтобы добавить первый файл
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(doc => {
            const cat = catMeta(doc.category);
            return (
              <div
                key={doc.id}
                className="glass rounded-2xl border border-white/10 p-4 hover:border-white/20 transition-all group"
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0`}>
                    <Icon name={mimeIcon(doc.mimeType) as never} size={22} className={cat.color} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap">
                      <span className="text-white font-medium text-sm truncate max-w-[300px]">
                        {doc.name}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 ${cat.color} flex-shrink-0`}>
                        {doc.categoryLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-white/30 text-xs">
                      <span>{doc.fileSizeHuman}</span>
                      <span>•</span>
                      <span>{formatDate(doc.createdAt)}</span>
                    </div>

                    {/* Note */}
                    {editNoteId === doc.id ? (
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="text"
                          value={editNoteText}
                          onChange={e => setEditNoteText(e.target.value)}
                          placeholder="Добавить заметку..."
                          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white/70 text-xs outline-none focus:border-neon-cyan/40 transition-colors"
                          onKeyDown={e => { if (e.key === "Enter") saveNote(); if (e.key === "Escape") setEditNoteId(null); }}
                          autoFocus
                        />
                        <button onClick={saveNote} disabled={savingNote}
                          className="text-neon-cyan text-xs px-3 py-1.5 bg-neon-cyan/10 border border-neon-cyan/20 rounded-lg hover:bg-neon-cyan/20 disabled:opacity-50">
                          {savingNote ? <Icon name="Loader2" size={12} className="animate-spin" /> : "Сохранить"}
                        </button>
                        <button onClick={() => setEditNoteId(null)}
                          className="text-white/30 hover:text-white/60 text-xs px-2 py-1.5">
                          Отмена
                        </button>
                      </div>
                    ) : doc.note ? (
                      <div
                        className="mt-1.5 flex items-center gap-1.5 text-white/40 text-xs cursor-pointer hover:text-white/60 transition-colors w-fit"
                        onClick={() => { setEditNoteId(doc.id); setEditNoteText(doc.note); }}
                      >
                        <Icon name="MessageSquare" size={11} />
                        <span className="italic">{doc.note}</span>
                        <Icon name="Pencil" size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditNoteId(doc.id); setEditNoteText(""); }}
                        className="mt-1.5 flex items-center gap-1 text-white/20 hover:text-white/40 text-xs transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Icon name="Plus" size={11} />добавить заметку
                      </button>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setSendChatFile({ url: doc.fileUrl, name: doc.name, size: doc.fileSize, mime: doc.mimeType })}
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white/30 hover:text-neon-cyan hover:bg-neon-cyan/10 transition-all"
                      title="Отправить в чат"
                    >
                      <Icon name="Send" size={16} />
                    </button>
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white/30 hover:text-neon-purple hover:bg-neon-purple/10 transition-all"
                      title="Открыть"
                    >
                      <Icon name="ExternalLink" size={16} />
                    </a>
                    <a
                      href={doc.fileUrl}
                      download={doc.name}
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white/30 hover:text-neon-purple hover:bg-neon-purple/10 transition-all"
                      title="Скачать"
                    >
                      <Icon name="Download" size={16} />
                    </a>
                    <button
                      onClick={() => setDeleteId(doc.id)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white/20 hover:text-neon-pink hover:bg-neon-pink/10 transition-all"
                      title="Удалить"
                    >
                      <Icon name="Trash2" size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Upload Modal ──────────────────────────────────────────────────── */}
      {uploadModal && uploadFile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => !uploadProgress && setUploadModal(false)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/15 shadow-2xl overflow-hidden"
               style={{ background: "#15152a" }}>
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-purple/60 to-transparent" />

            {/* Header */}
            <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-white/10">
              <div className="w-9 h-9 rounded-xl bg-neon-purple/20 flex items-center justify-center flex-shrink-0">
                <Icon name="Upload" size={16} className="text-neon-purple" />
              </div>
              <div className="flex-1">
                <h3 className="font-oswald font-bold text-base text-white">Загрузка документа</h3>
                <p className="text-white/40 text-xs truncate">{uploadFile.name}</p>
              </div>
              <span className="text-white/25 text-xs flex-shrink-0">
                {uploadFile.size > 1024 * 1024
                  ? `${(uploadFile.size / 1024 / 1024).toFixed(1)} МБ`
                  : `${Math.round(uploadFile.size / 1024)} КБ`}
              </span>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Category */}
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">Категория</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {categories.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setUploadCategory(c.value)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                        uploadCategory === c.value
                          ? "border-neon-purple/60 bg-neon-purple/20 text-white"
                          : "border-white/10 bg-white/5 text-white/50 hover:text-white hover:border-white/20"
                      }`}
                    >
                      <Icon name={c.icon as never} size={13} className={uploadCategory === c.value ? c.color : ""} />
                      <span className="truncate">{c.label}</span>
                      {uploadCategory === c.value && <Icon name="Check" size={11} className="ml-auto text-neon-purple flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">
                  Заметка <span className="normal-case text-white/20">(необязательно)</span>
                </label>
                <input
                  type="text"
                  value={uploadNote}
                  onChange={e => setUploadNote(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !uploadProgress && doUpload()}
                  placeholder="Например: версия от апреля 2025"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-white/20 outline-none focus:border-neon-purple/40 transition-colors"
                />
              </div>

              {uploadError && (
                <div className="flex items-center gap-2 text-neon-pink text-xs bg-neon-pink/10 border border-neon-pink/20 rounded-xl px-3 py-2">
                  <Icon name="AlertCircle" size={13} />
                  {uploadError}
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setUploadModal(false)}
                  disabled={uploadProgress}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 hover:text-white text-sm transition-all disabled:opacity-40"
                >
                  Отмена
                </button>
                <button
                  onClick={doUpload}
                  disabled={uploadProgress}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
                >
                  {uploadProgress
                    ? <><Icon name="Loader2" size={14} className="animate-spin" />Загружаю...</>
                    : <><Icon name="Upload" size={14} />Загрузить</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ──────────────────────────────────────────── */}
      {deleteId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !deleting && setDeleteId(null)} />
          <div className="relative z-10 w-full max-w-sm glass-strong rounded-2xl border border-white/10 p-6 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-2xl bg-neon-pink/10 flex items-center justify-center mx-auto mb-4">
              <Icon name="Trash2" size={24} className="text-neon-pink" />
            </div>
            <h3 className="font-oswald font-bold text-lg text-white mb-2">Удалить документ?</h3>
            <p className="text-white/40 text-sm mb-6">Это действие необратимо</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 hover:text-white text-sm transition-all disabled:opacity-40"
              >
                Отмена
              </button>
              <button
                onClick={doDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-neon-pink/20 border border-neon-pink/30 text-neon-pink font-semibold text-sm hover:bg-neon-pink/30 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {deleting
                  ? <><Icon name="Loader2" size={15} className="animate-spin" /> Удаляю...</>
                  : <><Icon name="Trash2" size={15} /> Удалить</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Send to Chat Modal ───────────────────────────────────────────── */}
      {sendChatFile && (
        <SendToConversationModal
          file={sendChatFile}
          onClose={() => setSendChatFile(null)}
        />
      )}
    </div>
  );
}