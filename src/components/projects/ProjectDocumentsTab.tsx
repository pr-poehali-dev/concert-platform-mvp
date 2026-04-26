import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";

const DOCS_URL = "https://functions.poehali.dev/b805f044-ba82-4db5-a2a5-7a88dfbfce4a";
const SESSION_KEY = "tourlink_session";

const CATEGORIES = [
  { value: "technical_rider", label: "Технический райдер", icon: "Settings2",  color: "text-neon-cyan" },
  { value: "domestic_rider",  label: "Бытовой райдер",     icon: "Coffee",     color: "text-neon-purple" },
  { value: "artist_contract", label: "Договор с артистом", icon: "FileText",   color: "text-neon-pink" },
  { value: "venue_contract",  label: "Договор с площадкой",icon: "Building2",  color: "text-amber-400" },
  { value: "other",           label: "Прочее",             icon: "File",       color: "text-white/40" },
];

const MIME_ICONS: Record<string, string> = {
  "application/pdf": "FileText",
  "application/msword": "FileText",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "FileText",
  "application/vnd.ms-excel": "Table",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Table",
  "image/jpeg": "Image",
  "image/png":  "Image",
  "text/plain": "AlignLeft",
  "application/zip": "Archive",
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
  projectId: string | null;
}

interface Props {
  projectId: string;
}

export default function ProjectDocumentsTab({ projectId }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState("all");

  // Upload
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadModal, setUploadModal] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("other");
  const [uploadNote, setUploadNote] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Note edit
  const [editNoteId, setEditNoteId] = useState<string | null>(null);
  const [editNoteText, setEditNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const session = () => localStorage.getItem(SESSION_KEY) || "";

  const loadDocs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${DOCS_URL}?action=list&project_id=${projectId}`, {
        headers: { "X-Session-Id": session() },
      });
      const data = await res.json();
      setDocs(data.documents || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { loadDocs(); }, [projectId]);

  // ── Upload ────────────────────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) { setUploadError("Файл больше 20 МБ"); return; }
    setUploadFile(f);
    setUploadError("");
    setUploadModal(true);
    e.target.value = "";
  };

  const doUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
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
          projectId,
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
    } finally { setUploading(false); }
  };

  // ── Delete ────────────────────────────────────────────────────────────
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

  // ── Note ──────────────────────────────────────────────────────────────
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

  // ── Helpers ───────────────────────────────────────────────────────────
  const catMeta = (cat: string) =>
    CATEGORIES.find(c => c.value === cat) ?? { icon: "File", color: "text-white/40", label: "Прочее" };
  const mimeIcon = (mime: string) => MIME_ICONS[mime] || "File";
  const filtered = filterCat === "all" ? docs : docs.filter(d => d.category === filterCat);
  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString("ru", { day: "numeric", month: "short", year: "numeric" }); }
    catch { return iso; }
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-oswald font-semibold text-lg text-white">Документы проекта</h3>
          <p className="text-white/30 text-sm">Райдеры, договоры и другие файлы по этому проекту</p>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 transition-opacity text-sm whitespace-nowrap"
        >
          <Icon name="Upload" size={15} />
          Загрузить документ
        </button>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.zip"
          onChange={handleFileSelect}
        />
      </div>

      {/* Stats row */}
      {docs.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {CATEGORIES.map(c => {
            const cnt = docs.filter(d => d.category === c.value).length;
            if (!cnt) return null;
            return (
              <button
                key={c.value}
                onClick={() => setFilterCat(prev => prev === c.value ? "all" : c.value)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs transition-all ${
                  filterCat === c.value
                    ? "border-neon-purple/50 bg-neon-purple/15 text-white"
                    : "border-white/10 bg-white/5 text-white/50 hover:text-white hover:border-white/20"
                }`}
              >
                <Icon name={c.icon as never} size={13} className={c.color} />
                <span className="truncate">{c.label}</span>
                <span className="ml-auto font-bold text-white/60">{cnt}</span>
              </button>
            );
          })}
          {filterCat !== "all" && (
            <button
              onClick={() => setFilterCat("all")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 text-white/30 hover:text-white text-xs transition-all"
            >
              <Icon name="X" size={12} /> Сбросить
            </button>
          )}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Icon name="Loader2" size={24} className="animate-spin text-neon-purple" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl border border-white/5 p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-neon-purple/10 flex items-center justify-center mx-auto mb-3">
            <Icon name="FileArchive" size={24} className="text-neon-purple/40" />
          </div>
          <p className="text-white/40 text-sm font-medium mb-1">
            {filterCat === "all" ? "Документов пока нет" : "Нет документов этой категории"}
          </p>
          <p className="text-white/20 text-xs">Загрузите райдеры, договоры и другие файлы проекта</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(doc => {
            const cat = catMeta(doc.category);
            return (
              <div
                key={doc.id}
                className="group glass rounded-xl border border-white/10 hover:border-white/20 transition-all p-4"
              >
                <div className="flex items-center gap-3">
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                    <Icon name={mimeIcon(doc.mimeType) as never} size={18} className={cat.color} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white text-sm font-medium truncate max-w-[260px]">{doc.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 ${cat.color} flex-shrink-0`}>
                        {doc.categoryLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-white/25 text-xs">
                      <span>{doc.fileSizeHuman}</span>
                      <span>·</span>
                      <span>{formatDate(doc.createdAt)}</span>
                    </div>

                    {/* Note inline */}
                    {editNoteId === doc.id ? (
                      <div className="flex items-center gap-2 mt-1.5">
                        <input
                          type="text"
                          value={editNoteText}
                          onChange={e => setEditNoteText(e.target.value)}
                          placeholder="Добавить заметку..."
                          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-white/70 text-xs outline-none focus:border-neon-cyan/40 transition-colors"
                          onKeyDown={e => { if (e.key === "Enter") saveNote(); if (e.key === "Escape") setEditNoteId(null); }}
                          autoFocus
                        />
                        <button onClick={saveNote} disabled={savingNote}
                          className="text-neon-cyan text-xs px-2.5 py-1 bg-neon-cyan/10 border border-neon-cyan/20 rounded-lg hover:bg-neon-cyan/20 disabled:opacity-50 whitespace-nowrap">
                          {savingNote ? <Icon name="Loader2" size={11} className="animate-spin" /> : "OK"}
                        </button>
                        <button onClick={() => setEditNoteId(null)} className="text-white/30 hover:text-white/60 text-xs">✕</button>
                      </div>
                    ) : doc.note ? (
                      <div
                        className="mt-1 flex items-center gap-1 text-white/35 text-xs cursor-pointer hover:text-white/60 w-fit transition-colors"
                        onClick={() => { setEditNoteId(doc.id); setEditNoteText(doc.note); }}
                      >
                        <Icon name="MessageSquare" size={10} />
                        <span className="italic">{doc.note}</span>
                        <Icon name="Pencil" size={9} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditNoteId(doc.id); setEditNoteText(""); }}
                        className="mt-1 flex items-center gap-1 text-white/20 hover:text-white/40 text-xs opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Icon name="Plus" size={10} />заметка
                      </button>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <a href={doc.fileUrl} target="_blank" rel="noreferrer"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white/25 hover:text-neon-cyan hover:bg-neon-cyan/10 transition-all"
                      title="Открыть">
                      <Icon name="ExternalLink" size={14} />
                    </a>
                    <a href={doc.fileUrl} download={doc.name}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white/25 hover:text-neon-purple hover:bg-neon-purple/10 transition-all"
                      title="Скачать">
                      <Icon name="Download" size={14} />
                    </a>
                    <button onClick={() => setDeleteId(doc.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white/15 hover:text-neon-pink hover:bg-neon-pink/10 transition-all"
                      title="Удалить">
                      <Icon name="Trash2" size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Upload Modal ───────────────────────────────────────────────── */}
      {uploadModal && uploadFile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !uploading && setUploadModal(false)} />
          <div className="relative z-10 w-full max-w-md glass-strong rounded-2xl border border-white/10 p-6 shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-purple/60 to-transparent rounded-t-2xl" />
            <h3 className="font-oswald font-bold text-lg text-white mb-4 flex items-center gap-2">
              <Icon name="Upload" size={17} className="text-neon-purple" />
              Добавить документ к проекту
            </h3>

            {/* File info */}
            <div className="flex items-center gap-3 glass rounded-xl p-3 border border-white/10 mb-4">
              <div className="w-9 h-9 rounded-lg bg-neon-purple/10 flex items-center justify-center flex-shrink-0">
                <Icon name={mimeIcon(uploadFile.type) as never} size={16} className="text-neon-purple" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{uploadFile.name}</p>
                <p className="text-white/30 text-xs">
                  {uploadFile.size > 1024 * 1024
                    ? `${(uploadFile.size / 1024 / 1024).toFixed(1)} МБ`
                    : `${Math.round(uploadFile.size / 1024)} КБ`}
                </p>
              </div>
            </div>

            {/* Category */}
            <div className="mb-4">
              <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">Категория</label>
              <div className="grid grid-cols-1 gap-1.5">
                {CATEGORIES.map(c => (
                  <button key={c.value} type="button" onClick={() => setUploadCategory(c.value)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-sm transition-all ${
                      uploadCategory === c.value
                        ? "border-neon-purple/50 bg-neon-purple/15 text-white"
                        : "border-white/10 bg-white/5 text-white/50 hover:text-white hover:border-white/20"
                    }`}>
                    <Icon name={c.icon as never} size={14} className={uploadCategory === c.value ? c.color : ""} />
                    {c.label}
                    {uploadCategory === c.value && (
                      <Icon name="Check" size={13} className="ml-auto text-neon-purple" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Note */}
            <div className="mb-5">
              <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">
                Заметка <span className="normal-case text-white/20">(необязательно)</span>
              </label>
              <input type="text" value={uploadNote} onChange={e => setUploadNote(e.target.value)}
                placeholder="Например: версия для Москвы"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-white/20 outline-none focus:border-neon-purple/40 transition-colors" />
            </div>

            {uploadError && (
              <div className="flex items-center gap-2 text-neon-pink text-sm bg-neon-pink/10 border border-neon-pink/20 rounded-xl px-3 py-2 mb-4">
                <Icon name="AlertCircle" size={14} />{uploadError}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setUploadModal(false)} disabled={uploading}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 hover:text-white text-sm transition-all disabled:opacity-40">
                Отмена
              </button>
              <button onClick={doUpload} disabled={uploading}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold text-sm hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                {uploading
                  ? <><Icon name="Loader2" size={14} className="animate-spin" />Загружаю...</>
                  : <><Icon name="Upload" size={14} />Загрузить</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ─────────────────────────────────────────────── */}
      {deleteId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !deleting && setDeleteId(null)} />
          <div className="relative z-10 w-full max-w-sm glass-strong rounded-2xl border border-white/10 p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-xl bg-neon-pink/10 flex items-center justify-center mx-auto mb-3">
              <Icon name="Trash2" size={20} className="text-neon-pink" />
            </div>
            <h3 className="font-oswald font-bold text-lg text-white mb-1">Удалить документ?</h3>
            <p className="text-white/30 text-sm mb-5">Это действие необратимо</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} disabled={deleting}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 hover:text-white text-sm transition-all">
                Отмена
              </button>
              <button onClick={doDelete} disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-neon-pink/20 border border-neon-pink/30 text-neon-pink font-semibold text-sm hover:bg-neon-pink/30 disabled:opacity-50 flex items-center justify-center gap-2">
                {deleting ? <><Icon name="Loader2" size={14} className="animate-spin" />Удаляю...</> : <><Icon name="Trash2" size={14} />Удалить</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
