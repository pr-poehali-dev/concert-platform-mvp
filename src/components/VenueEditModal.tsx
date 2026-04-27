import { useState, useCallback, useEffect } from "react";
import Icon from "@/components/ui/icon";
import VenueStepContent, { type VenueForm, type PhotoItem } from "@/components/venue-setup/VenueStepContent";

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

const STEPS = ["Основное", "Детали", "Даты", "Медиа"];

export default function VenueEditModal({ venue, onClose, onSaved }: Props) {
  const [step, setStep]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const [form, setForm] = useState<VenueForm>({
    name:        venue.name        || "",
    city:        venue.city        || "Москва",
    address:     venue.address     || "",
    venueType:   venue.venueType   || "Клуб",
    capacity:    String(venue.capacity  || ""),
    priceFrom:   String(venue.priceFrom || ""),
    description: venue.description || "",
    tags:        venue.tags        || [],
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
        venueId:     venue.id,
        name:        form.name,
        city:        form.city,
        address:     form.address,
        venueType:   form.venueType,
        capacity:    Number(form.capacity),
        priceFrom:   Number(form.priceFrom) || 0,
        description: form.description,
        tags:        form.tags,
        busyDates:   Array.from(busyDates).map(d => ({ date: d, note: "" })),
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

  // Для VenueStepContent на шаге медиа показываем новые фото + превью существующих
  const allPhotosForStep: PhotoItem[] = [
    ...existingPhotos.map(url => ({ file: new File([], ""), preview: url, id: url })),
    ...newPhotos,
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl glass-strong rounded-2xl overflow-hidden animate-scale-in flex flex-col max-h-[92vh]">
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

        {/* Шаг 4 — Медиа (кастомный, с поддержкой существующих фото) */}
        {step === 4 && (
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
            {error && (
              <div className="flex items-center gap-2 text-neon-pink text-sm bg-neon-pink/10 border border-neon-pink/20 rounded-xl px-3 py-2">
                <Icon name="AlertCircle" size={14} />{error}
              </div>
            )}

            {/* Существующие фото */}
            {existingPhotos.length > 0 && (
              <div>
                <p className="text-white/50 text-xs uppercase tracking-wider mb-3">Текущие фотографии</p>
                <div className="grid grid-cols-3 gap-3">
                  {existingPhotos.map((url, i) => (
                    <div key={url} className="relative group rounded-xl overflow-hidden aspect-video bg-white/5">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      {i === 0 && <span className="absolute top-1.5 left-1.5 text-[10px] bg-neon-cyan/80 text-background px-1.5 py-0.5 rounded font-bold">Главное</span>}
                      <button
                        onClick={() => removeExistingPhoto(url)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-neon-pink"
                      >
                        <Icon name="X" size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Добавить новые фото */}
            <div>
              <p className="text-white/50 text-xs uppercase tracking-wider mb-3">Добавить фотографии</p>
              {newPhotos.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-3">
                  {newPhotos.map((p, i) => (
                    <div key={p.id} className="relative group rounded-xl overflow-hidden aspect-video bg-white/5">
                      <img src={p.preview} alt="" className="w-full h-full object-cover" />
                      <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {i > 0 && <button onClick={() => moveNewPhoto(p.id, -1)} className="w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white"><Icon name="ChevronLeft" size={10} /></button>}
                        {i < newPhotos.length - 1 && <button onClick={() => moveNewPhoto(p.id, 1)} className="w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white"><Icon name="ChevronRight" size={10} /></button>}
                        <button onClick={() => removeNewPhoto(p.id)} className="w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-neon-pink"><Icon name="X" size={10} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-white/15 rounded-xl py-6 cursor-pointer hover:border-neon-purple/40 transition-colors">
                <Icon name="ImagePlus" size={24} className="text-white/20" />
                <span className="text-white/40 text-sm">Выберите фотографии</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleAddPhotos} />
              </label>
            </div>

            {/* Текущие файлы */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Технический райдер</p>
                {(riderUrl || riderFile) && (
                  <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 mb-2 border border-white/10">
                    <Icon name="FileText" size={14} className="text-neon-cyan shrink-0" />
                    <span className="text-white/60 text-xs truncate flex-1">{riderFile?.name || riderName || "Текущий райдер"}</span>
                    <button onClick={() => { setRiderFile(null); setRiderUrl(""); setRiderName(""); }} className="text-neon-pink hover:opacity-80">
                      <Icon name="X" size={12} />
                    </button>
                  </div>
                )}
                <label className="flex items-center gap-2 px-3 py-2 border border-white/10 rounded-xl cursor-pointer hover:border-neon-purple/40 transition-colors text-white/40 hover:text-white/60 text-xs">
                  <Icon name="Upload" size={14} />{riderFile ? riderFile.name : "Загрузить новый"}
                  <input type="file" accept=".pdf,.doc,.docx" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) { setRiderFile(f); setRiderUrl(""); } e.target.value = ""; }} />
                </label>
              </div>
              <div>
                <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Схема площадки</p>
                {(schemaUrl || schemaFile) && (
                  <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 mb-2 border border-white/10">
                    <Icon name="Map" size={14} className="text-neon-purple shrink-0" />
                    <span className="text-white/60 text-xs truncate flex-1">{schemaFile?.name || schemaName || "Текущая схема"}</span>
                    <button onClick={() => { setSchemaFile(null); setSchemaUrl(""); setSchemaName(""); }} className="text-neon-pink hover:opacity-80">
                      <Icon name="X" size={12} />
                    </button>
                  </div>
                )}
                <label className="flex items-center gap-2 px-3 py-2 border border-white/10 rounded-xl cursor-pointer hover:border-neon-purple/40 transition-colors text-white/40 hover:text-white/60 text-xs">
                  <Icon name="Upload" size={14} />{schemaFile ? schemaFile.name : "Загрузить новую"}
                  <input type="file" accept=".pdf,.jpg,.png" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) { setSchemaFile(f); setSchemaUrl(""); } e.target.value = ""; }} />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 shrink-0">
          <button onClick={() => step > 1 ? setStep(s => s - 1) : onClose()}
            className="flex items-center gap-2 px-4 py-2 glass rounded-xl text-white/60 hover:text-white transition-colors text-sm">
            <Icon name="ChevronLeft" size={16} />
            {step === 1 ? "Отмена" : "Назад"}
          </button>

          {step < STEPS.length ? (
            <button onClick={() => { setError(""); setStep(s => s + 1); }}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 transition-opacity text-sm">
              Далее <Icon name="ChevronRight" size={16} />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity text-sm">
              {loading ? <><Icon name="Loader2" size={16} className="animate-spin" />Сохранение...</> : <><Icon name="Check" size={16} />Сохранить изменения</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
