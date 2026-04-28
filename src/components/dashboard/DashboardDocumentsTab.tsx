import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";
import SendToConversationModal from "@/components/chat/SendToConversationModal";
import {
  DOCS_URL, SESSION_KEY,
  CATEGORIES_ORGANIZER, CATEGORIES_VENUE,
  type Doc, type Category,
} from "./documents/docTypes";
import DocUploadModal from "./documents/DocUploadModal";
import DocDeleteModal from "./documents/DocDeleteModal";
import DocCard from "./documents/DocCard";

export default function DashboardDocumentsTab() {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState("all");
  const [filterFolder, setFilterFolder] = useState("all");
  const [newFolder, setNewFolder] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [extraFolders, setExtraFolders] = useState<string[]>([]);

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
  const categories: Category[] = isVenue ? CATEGORIES_VENUE : CATEGORIES_ORGANIZER;

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

  // ── Move to folder ─────────────────────────────────────────────────────
  const moveToFolder = async (docId: string, folder: string) => {
    await fetch(`${DOCS_URL}?action=update_folder`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Id": session() },
      body: JSON.stringify({ id: docId, folder }),
    });
    setDocs(prev => prev.map(d => d.id === docId ? { ...d, folder } : d));
  };

  // ── Helpers ────────────────────────────────────────────────────────────
  const catMeta = (cat: string): Category =>
    categories.find(c => c.value === cat) ?? { icon: "File", color: "text-white/40", label: "Прочее", value: "other" };

  const allFolders = Array.from(new Set([
    ...extraFolders,
    ...docs.map(d => d.folder || "").filter(Boolean),
  ])).sort();

  const filtered = docs.filter(d => {
    if (filterCat !== "all" && d.category !== filterCat) return false;
    if (filterFolder !== "all") {
      if (filterFolder === "__none__") return !d.folder;
      return d.folder === filterFolder;
    }
    return true;
  });

  // suppress unused warning — uploading used implicitly via uploadProgress
  void uploading;

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

      {/* Папки */}
      <div className="flex items-center gap-2 flex-wrap">
        <Icon name="Folder" size={14} className="text-white/30" />
        <button
          onClick={() => setFilterFolder("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterFolder === "all" ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30" : "glass text-white/40 border border-white/10 hover:text-white"}`}
        >
          Все папки
        </button>
        <button
          onClick={() => setFilterFolder("__none__")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterFolder === "__none__" ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30" : "glass text-white/40 border border-white/10 hover:text-white"}`}
        >
          Без папки
        </button>
        {allFolders.map(f => (
          <button
            key={f}
            onClick={() => setFilterFolder(f)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterFolder === f ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30" : "glass text-white/40 border border-white/10 hover:text-white"}`}
          >
            <Icon name="FolderOpen" size={11} />
            {f}
            <span className="text-[10px] opacity-60">({docs.filter(d => d.folder === f).length})</span>
          </button>
        ))}
        {showNewFolder ? (
          <div className="flex items-center gap-1.5">
            <input
              value={newFolder}
              onChange={e => setNewFolder(e.target.value)}
              placeholder="Название папки"
              className="glass border border-neon-cyan/30 rounded-lg px-3 py-1.5 text-white text-xs outline-none w-36"
              onKeyDown={e => {
                if (e.key === "Enter" && newFolder.trim()) {
                  const name = newFolder.trim();
                  setExtraFolders(prev => prev.includes(name) ? prev : [...prev, name]);
                  setFilterFolder(name);
                  setShowNewFolder(false);
                  setNewFolder("");
                }
                if (e.key === "Escape") { setShowNewFolder(false); setNewFolder(""); }
              }}
              autoFocus
            />
            <button
              onClick={() => {
                if (newFolder.trim()) {
                  const name = newFolder.trim();
                  setExtraFolders(prev => prev.includes(name) ? prev : [...prev, name]);
                  setFilterFolder(name);
                }
                setShowNewFolder(false);
                setNewFolder("");
              }}
              className="text-neon-cyan text-xs px-2 py-1.5 bg-neon-cyan/10 border border-neon-cyan/20 rounded-lg hover:bg-neon-cyan/20"
            >
              ОК
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowNewFolder(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-white/25 border border-dashed border-white/10 hover:text-white/50 hover:border-white/20 transition-all"
          >
            <Icon name="Plus" size={11} />Новая папка
          </button>
        )}
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
          {filtered.map(doc => (
            <DocCard
              key={doc.id}
              doc={doc}
              catMeta={catMeta}
              editNoteId={editNoteId}
              editNoteText={editNoteText}
              savingNote={savingNote}
              folders={allFolders}
              onEditNote={(id, text) => { setEditNoteId(id); setEditNoteText(text); }}
              onCancelNote={() => setEditNoteId(null)}
              onNoteTextChange={setEditNoteText}
              onSaveNote={saveNote}
              onSendToChat={setSendChatFile}
              onDelete={setDeleteId}
              onMoveToFolder={moveToFolder}
            />
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {uploadModal && uploadFile && (
        <DocUploadModal
          file={uploadFile}
          categories={categories}
          uploadCategory={uploadCategory}
          uploadNote={uploadNote}
          uploadProgress={uploadProgress}
          uploadError={uploadError}
          onCategoryChange={setUploadCategory}
          onNoteChange={setUploadNote}
          onUpload={doUpload}
          onClose={() => setUploadModal(false)}
        />
      )}

      {/* Delete Modal */}
      {deleteId && (
        <DocDeleteModal
          deleting={deleting}
          onConfirm={doDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}

      {/* Send to Chat Modal */}
      {sendChatFile && (
        <SendToConversationModal
          file={sendChatFile}
          onClose={() => setSendChatFile(null)}
        />
      )}
    </div>
  );
}