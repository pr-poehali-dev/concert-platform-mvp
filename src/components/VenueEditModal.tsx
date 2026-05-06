import { useState, useCallback, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import VenueStepContent, { type VenueForm, type PhotoItem } from "@/components/venue-setup/VenueStepContent";
import { useAuth } from "@/context/AuthContext";
import VenueEditStepMedia from "@/components/venue-edit/VenueEditStepMedia";
import VenueEditStepContract from "@/components/venue-edit/VenueEditStepContract";
import VenueEditDeleteConfirm from "@/components/venue-edit/VenueEditDeleteConfirm";

const VENUES_URL = "https://functions.poehali.dev/9f704d9c-5798-4fde-8263-7e036dae1545";

export interface VenueData {
  id: string;
  name: string;
  city: string;
  address: string;
  venueType: string;
  capacity: number;
  priceFrom: number;
  description: string;
  tags: string[];
  photos: string[];
  photoUrl: string;
  riderUrl: string;
  riderName: string;
  schemaUrl: string;
  schemaName: string;
  busyDates: { date: string; note: string }[];
  phone?: string;
  email?: string;
  website?: string;
  telegram?: string;
  vk?: string;
  instagram?: string;
  whatsapp?: string;
  youtube?: string;
  contractTemplate?: string;
  contractSubject?: string;
}

interface Props {
  venue: VenueData;
  onClose: () => void;
  onSaved: () => void;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res((r.result as string).split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

const STEPS = ["Основное", "Детали", "Даты", "Медиа", "Договор"];

export default function VenueEditModal({ venue, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const [step, setStep]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const deletingRef = useRef(false);

  const [form, setForm] = useState<VenueForm>({
    name:        venue.name        || "",
    city:        venue.city        || "Москва",
    address:     venue.address     || "",
    venueType:   venue.venueType   || "Клуб",
    capacity:    String(venue.capacity  || ""),
    priceFrom:   String(venue.priceFrom || ""),
    description: venue.description || "",
    tags:        venue.tags        || [],
    phone:       venue.phone       || "",
    email:       venue.email       || "",
    website:     venue.website     || "",
    telegram:    venue.telegram    || "",
    vk:          venue.vk          || "",
    instagram:   venue.instagram   || "",
    whatsapp:    venue.whatsapp    || "",
    youtube:     venue.youtube     || "",
  });

  // Существующие фото из CDN (уже загруженные)
  const [existingPhotos, setExistingPhotos] = useState<string[]>(
    venue.photos?.length ? venue.photos : venue.photoUrl ? [venue.photoUrl] : []
  );
  // Новые фото для загрузки
  const [newPhotos, setNewPhotos] = useState<PhotoItem[]>([]);

  // Файлы
  const [riderFile, setRiderFile]   = useState<File | null>(null);
  const [schemaFile, setSchemaFile] = useState<File | null>(null);
  const [riderUrl, setRiderUrl]     = useState(venue.riderUrl   || "");
  const [riderName, setRiderName]   = useState(venue.riderName  || "");
  const [schemaUrl, setSchemaUrl]   = useState(venue.schemaUrl  || "");
  const [schemaName, setSchemaName] = useState(venue.schemaName || "");

  // Занятые даты
  const [busyDates, setBusyDates] = useState<Set<string>>(
    new Set((venue.busyDates || []).map(d => d.date))
  );

  // Договор
  const [contractTemplate, setContractTemplate] = useState(venue.contractTemplate || "");
  const [contractSubject, setContractSubject] = useState(venue.contractSubject || "");

  // Передача площадки
  const [transferId, setTransferId] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState("");
  const [transferSuccess, setTransferSuccess] = useState(false);

  useEffect(() => { document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = ""; }; }, []);

  const toggleBusyDate = useCallback((ds: string) => {
    setBusyDates(prev => {
      const next = new Set(prev);
      if (next.has(ds)) next.delete(ds); else next.add(ds);
      return next;
    });
  }, []);

  const handleFormChange = (key: string, val: unknown) => setForm(f => ({ ...f, [key]: val }));

  const handleAddPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const items: PhotoItem[] = files.map(f => ({
      file: f,
      preview: URL.createObjectURL(f),
      id: Math.random().toString(36).slice(2),
    }));
    setNewPhotos(prev => [...prev, ...items].slice(0, 10 - existingPhotos.length));
    e.target.value = "";
  };

  const removeNewPhoto = (id: string) => setNewPhotos(prev => prev.filter(p => p.id !== id));
  const moveNewPhoto = (id: string, dir: -1 | 1) => {
    setNewPhotos(prev => {
      const idx = prev.findIndex(p => p.id === id);
      if (idx < 0) return prev;
      const next = [...prev];
      const swap = idx + dir;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  };
  const removeExistingPhoto = (url: string) => setExistingPhotos(prev => prev.filter(u => u !== url));

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError("Введите название площадки"); return; }
    if (!form.city)        { setError("Выберите город"); return; }
    if (!form.address.trim()) { setError("Введите адрес"); return; }
    if (!form.capacity || Number(form.capacity) <= 0) { setError("Укажите вместимость"); return; }

    setLoading(true); setError("");
    try {
      const payload: Record<string, unknown> = {
        venueId:          venue.id,
        name:             form.name,
        city:             form.city,
        address:          form.address,
        venueType:        form.venueType,
        capacity:         Number(form.capacity),
        priceFrom:        Number(form.priceFrom) || 0,
        description:      form.description,
        tags:             form.tags,
        phone:            form.phone,
        email:            form.email,
        website:          form.website,
        telegram:         form.telegram,
        vk:               form.vk,
        instagram:        form.instagram,
        whatsapp:         form.whatsapp,
        youtube:          form.youtube,
        contractTemplate: contractTemplate,
        contractSubject:  contractSubject,
        busyDates:        Array.from(busyDates).map(d => ({ date: d, note: "" })),
        existingPhotos,
      };

      // Новые фото
      if (newPhotos.length > 0) {
        payload.photosBase64 = await Promise.all(
          newPhotos.map(async p => ({
            data: await fileToBase64(p.file),
            mime: p.file.type || "image/jpeg",
          }))
        );
      }

      // Новый райдер
      if (riderFile) {
        payload.riderBase64   = await fileToBase64(riderFile);
        payload.riderMime     = riderFile.type;
        payload.riderFileName = riderFile.name;
      }
      // Новая схема
      if (schemaFile) {
        payload.schemaBase64   = await fileToBase64(schemaFile);
        payload.schemaMime     = schemaFile.type;
        payload.schemaFileName = schemaFile.name;
      }
      // Если файлы удалены
      if (!riderFile && !riderUrl) { payload.clearRider = true; }
      if (!schemaFile && !schemaUrl) { payload.clearSchema = true; }

      const res = await fetch(`${VENUES_URL}?action=update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка сохранения");

      onSaved();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка при сохранении");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deletingRef.current) return;
    if (!user) { setError("Сессия истекла, войдите заново"); return; }
    deletingRef.current = true;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`${VENUES_URL}?action=delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueId: venue.id, userId: user.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Не удалось удалить площадку");
      onSaved();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка при удалении");
    } finally {
      setDeleting(false);
      deletingRef.current = false;
    }
  };

  const handleTransfer = async () => {
    if (!transferId.trim()) { setTransferError("Введите ID кабинета"); return; }
    if (!user) { setTransferError("Требуется авторизация"); return; }
    setTransferring(true); setTransferError(""); setTransferSuccess(false);
    try {
      const res = await fetch(`${VENUES_URL}?action=transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueId: venue.id, userId: user.id, targetDisplayId: transferId.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка передачи");
      setTransferSuccess(true);
      setTimeout(() => { onSaved(); onClose(); }, 1500);
    } catch (e: unknown) {
      setTransferError(e instanceof Error ? e.message : "Ошибка при передаче");
    } finally {
      setTransferring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100]" style={{ top: "304px" }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-4 flex items-center justify-center">
      <div className="relative z-10 w-full max-w-2xl glass-strong rounded-2xl overflow-hidden animate-scale-in flex flex-col" style={{ maxHeight: "calc(100dvh - 304px - 2rem)" }}>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-purple to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 shrink-0">
          <div>
            <h2 className="font-oswald font-bold text-2xl text-white">Редактировать площадку</h2>
            <p className="text-white/40 text-sm mt-0.5 truncate max-w-sm">{venue.name} · Шаг {step} из {STEPS.length}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/50 hover:text-white">
            <Icon name="X" size={16} />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 px-6 pb-4 shrink-0">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <button
                onClick={() => setStep(i + 1)}
                className={`flex items-center gap-1.5 transition-colors ${i + 1 <= step ? "text-neon-purple" : "text-white/25"}`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${i + 1 < step ? "bg-neon-purple border-neon-purple text-background" : i + 1 === step ? "border-neon-purple text-neon-purple" : "border-white/20 text-white/25"}`}>
                  {i + 1 < step ? <Icon name="Check" size={12} /> : i + 1}
                </div>
                <span className="text-xs hidden sm:block">{s}</span>
              </button>
              {i < STEPS.length - 1 && <div className={`flex-1 h-px transition-colors ${i + 1 < step ? "bg-neon-purple/60" : "bg-white/10"}`} />}
            </div>
          ))}
        </div>

        {/* Контент шагов 1-3 — через VenueStepContent */}
        {step <= 3 && (
          <VenueStepContent
            step={step}
            form={form}
            onFormChange={handleFormChange}
            busyDates={busyDates}
            onToggleBusyDate={toggleBusyDate}
            photos={[]}
            onAddPhotos={() => {}}
            onRemovePhoto={() => {}}
            onMovePhoto={() => {}}
            riderFile={riderFile}
            onSetRider={setRiderFile}
            onClearRider={() => { setRiderFile(null); setRiderUrl(""); setRiderName(""); }}
            schemaFile={schemaFile}
            onSetSchema={setSchemaFile}
            onClearSchema={() => { setSchemaFile(null); setSchemaUrl(""); setSchemaName(""); }}
            error={error}
          />
        )}

        {/* Шаг 4 — Медиа */}
        {step === 4 && (
          <VenueEditStepMedia
            error={error}
            existingPhotos={existingPhotos}
            newPhotos={newPhotos}
            riderUrl={riderUrl}
            riderFile={riderFile}
            riderName={riderName}
            schemaUrl={schemaUrl}
            schemaFile={schemaFile}
            schemaName={schemaName}
            onAddPhotos={handleAddPhotos}
            onRemoveNewPhoto={removeNewPhoto}
            onMoveNewPhoto={moveNewPhoto}
            onRemoveExistingPhoto={removeExistingPhoto}
            onSetRiderFile={f => { setRiderFile(f); setRiderUrl(""); }}
            onClearRider={() => { setRiderFile(null); setRiderUrl(""); setRiderName(""); }}
            onSetSchemaFile={f => { setSchemaFile(f); setSchemaUrl(""); }}
            onClearSchema={() => { setSchemaFile(null); setSchemaUrl(""); setSchemaName(""); }}
          />
        )}

        {/* Шаг 5 — Договор и передача */}
        {step === 5 && (
          <VenueEditStepContract
            contractSubject={contractSubject}
            contractTemplate={contractTemplate}
            transferId={transferId}
            transferring={transferring}
            transferError={transferError}
            transferSuccess={transferSuccess}
            onContractSubjectChange={setContractSubject}
            onContractTemplateChange={setContractTemplate}
            onTransferIdChange={setTransferId}
            onTransfer={handleTransfer}
          />
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={() => step > 1 ? setStep(s => s - 1) : onClose()}
              className="flex items-center gap-2 px-4 py-2 glass rounded-xl text-white/60 hover:text-white transition-colors text-sm">
              <Icon name="ChevronLeft" size={16} />
              {step === 1 ? "Отмена" : "Назад"}
            </button>
            <button
              onClick={() => { setError(""); setConfirmDelete(true); }}
              disabled={loading || deleting}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-neon-pink/80 hover:text-neon-pink hover:bg-neon-pink/10 border border-neon-pink/20 hover:border-neon-pink/40 transition-all text-sm disabled:opacity-50"
              title="Удалить площадку"
            >
              <Icon name="Trash2" size={14} />
              <span className="hidden sm:inline">Удалить</span>
            </button>
          </div>

          {step < STEPS.length ? (
            <button onClick={() => { setError(""); setStep(s => s + 1); }}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 transition-opacity text-sm">
              Далее <Icon name="ChevronRight" size={16} />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading || deleting}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity text-sm">
              {loading ? <><Icon name="Loader2" size={16} className="animate-spin" />Сохранение...</> : <><Icon name="Check" size={16} />Сохранить изменения</>}
            </button>
          )}
        </div>
      </div>

      {/* Подтверждение удаления */}
      {confirmDelete && (
        <VenueEditDeleteConfirm
          venueName={venue.name}
          error={error}
          deleting={deleting}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
      </div>
    </div>
  );
}