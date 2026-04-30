import { useState, useEffect } from "react";
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
import DocHeader from "./documents/DocHeader";
import DocCategoryFilter from "./documents/DocCategoryFilter";
import DocFolderBar from "./documents/DocFolderBar";
import DocDeleteFolderModal from "./documents/DocDeleteFolderModal";

export default function DashboardDocumentsTab() {
  const { user } = useAuth();

  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState("all");
  const [filterFolder, setFilterFolder] = useState("all");
  const [search, setSearch] = useState("");
  const [newFolder, setNewFolder] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [extraFolders, setExtraFolders] = useState<string[]>([]);
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deletingFolder, setDeletingFolder] = useState<string | null>(null);

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
    setDocs(prev => prev.map(d => d.id === docId ? { ...d, folder } : d));
    try {
      const res = await fetch(`${DOCS_URL}?action=update_folder`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Id": session() },
        body: JSON.stringify({ id: docId, folder }),
      });
      if (!res.ok) await loadDocs();
    } catch {
      await loadDocs();
    }
  };

  // ── Rename folder ──────────────────────────────────────────────────────
  const renameFolder = async (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) { setRenamingFolder(null); return; }
    const toUpdate = docs.filter(d => d.folder === oldName);
    setDocs(prev => prev.map(d => d.folder === oldName ? { ...d, folder: trimmed } : d));
    setExtraFolders(prev => prev.map(f => f === oldName ? trimmed : f));
    if (filterFolder === oldName) setFilterFolder(trimmed);
    setRenamingFolder(null);
    try {
      const results = await Promise.all(toUpdate.map(d =>
        fetch(`${DOCS_URL}?action=update_folder`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Session-Id": session() },
          body: JSON.stringify({ id: d.id, folder: trimmed }),
        })
      ));
      if (results.some(r => !r.ok)) await loadDocs();
    } catch {
      await loadDocs();
    }
  };

  // ── Delete folder ──────────────────────────────────────────────────────
  const deleteFolder = async (name: string) => {
    const toUpdate = docs.filter(d => d.folder === name);
    setDocs(prev => prev.map(d => d.folder === name ? { ...d, folder: "" } : d));
    setExtraFolders(prev => prev.filter(f => f !== name));
    if (filterFolder === name) setFilterFolder("all");
    setDeletingFolder(null);
    try {
      const results = await Promise.all(toUpdate.map(d =>
        fetch(`${DOCS_URL}?action=update_folder`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Session-Id": session() },
          body: JSON.stringify({ id: d.id, folder: "" }),
        })
      ));
      if (results.some(r => !r.ok)) await loadDocs();
    } catch {
      await loadDocs();
    }
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
    if (search.trim()) {
      const q = search.toLowerCase();
      return d.name?.toLowerCase().includes(q) || d.note?.toLowerCase().includes(q);
    }
    return true;
  });

  void uploading;

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <DocHeader
        docs={docs}
        search={search}
        isVenue={isVenue}
        onSearchChange={setSearch}
        onFileSelect={handleFileSelect}
      />

      <DocCategoryFilter
        docs={docs}
        categories={categories}
        filterCat={filterCat}
        onFilterCat={setFilterCat}
      />

      <DocFolderBar
        docs={docs}
        allFolders={allFolders}
        filterFolder={filterFolder}
        renamingFolder={renamingFolder}
        renameValue={renameValue}
        showNewFolder={showNewFolder}
        newFolder={newFolder}
        onFilterFolder={setFilterFolder}
        onStartRename={f => { setRenamingFolder(f); setRenameValue(f); }}
        onRenameValueChange={setRenameValue}
        onRenameConfirm={renameFolder}
        onRenameCancel={() => setRenamingFolder(null)}
        onDeleteFolder={f => setDeletingFolder(f)}
        onShowNewFolder={() => setShowNewFolder(true)}
        onNewFolderChange={setNewFolder}
        onNewFolderConfirm={() => {
          const name = newFolder.trim();
          if (name) {
            setExtraFolders(prev => prev.includes(name) ? prev : [...prev, name]);
            setFilterFolder(name);
          }
          setShowNewFolder(false);
          setNewFolder("");
        }}
        onNewFolderCancel={() => { setShowNewFolder(false); setNewFolder(""); }}
      />

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Icon name="Loader2" size={28} className="animate-spin text-neon-purple" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl border border-white/5 p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-neon-purple/10 flex items-center justify-center mx-auto mb-4">
            <Icon name={search ? "SearchX" : "FolderOpen"} size={28} className="text-neon-purple/50" />
          </div>
          <p className="text-white/50 font-medium mb-1">
            {search
              ? `Ничего не найдено по запросу «${search}»`
              : filterCat === "all" && filterFolder === "all"
                ? "Документов пока нет"
                : "Нет документов по выбранному фильтру"}
          </p>
          <p className="text-white/25 text-sm">
            {search
              ? "Попробуй другой запрос или сброс фильтров"
              : "Нажми «Загрузить» чтобы добавить первый файл"}
          </p>
          {(search || filterCat !== "all" || filterFolder !== "all") && (
            <button
              onClick={() => { setSearch(""); setFilterCat("all"); setFilterFolder("all"); }}
              className="mt-4 px-4 py-2 rounded-xl glass border border-white/10 text-white/40 text-sm hover:text-white transition-all"
            >
              Сбросить фильтры
            </button>
          )}
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

      {deleteId && (
        <DocDeleteModal
          deleting={deleting}
          onConfirm={doDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}

      {sendChatFile && (
        <SendToConversationModal
          file={sendChatFile}
          onClose={() => setSendChatFile(null)}
        />
      )}

      {deletingFolder && (
        <DocDeleteFolderModal
          folderName={deletingFolder}
          onConfirm={deleteFolder}
          onCancel={() => setDeletingFolder(null)}
        />
      )}
    </div>
  );
}
