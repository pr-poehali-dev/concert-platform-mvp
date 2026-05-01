import { useState, useCallback, useRef } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationsContext";
import VenueStepContent, { type VenueForm, type PhotoItem } from "@/components/venue-setup/VenueStepContent";
import { compressImage, fileToBase64 } from "@/lib/imageCompress";

const VENUES_URL = "https://functions.poehali.dev/9f704d9c-5798-4fde-8263-7e036dae1545";

interface VenueSetupModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function VenueSetupModal({ open, onClose, onCreated }: VenueSetupModalProps) {
  const { user } = useAuth();
  const { sendNotification } = useNotifications();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState({ stage: "", current: 0, total: 0 });
  const submittingRef = useRef(false);

  const [form, setForm] = useState<VenueForm>({
    name: "", city: "Москва", address: "", venueType: "Клуб",
    capacity: "", priceFrom: "", description: "", tags: [],
  });

  // Фотографии — несколько
  const [photos, setPhotos] = useState<PhotoItem[]>([]);

  // Файлы
  const [riderFile, setRiderFile] = useState<File | null>(null);
  const [schemaFile, setSchemaFile] = useState<File | null>(null);

  // Занятые даты — Set строк "YYYY-MM-DD"
  const [busyDates, setBusyDates] = useState<Set<string>>(new Set());

  const toggleBusyDate = useCallback((ds: string) => {
    setBusyDates(prev => {
      const next = new Set(prev);
      if (next.has(ds)) next.delete(ds); else next.add(ds);
      return next;
    });
  }, []);

  if (!open) return null;

  const handleFormChange = (key: string, val: unknown) => setForm(f => ({ ...f, [key]: val }));

  const handlePhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const items: PhotoItem[] = files.map(f => ({
      file: f,
      preview: URL.createObjectURL(f),
      id: Math.random().toString(36).slice(2),
    }));
    setPhotos(prev => [...prev, ...items].slice(0, 10));
    e.target.value = "";
  };

  const removePhoto = (id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
  };

  const movePhoto = (id: string, dir: -1 | 1) => {
    setPhotos(prev => {
      const idx = prev.findIndex(p => p.id === id);
      if (idx < 0) return prev;
      const next = [...prev];
      const swap = idx + dir;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  };

  const validate = () => {
    if (!form.name.trim()) return "Введите название площадки";
    if (!form.city) return "Выберите город";
    if (!form.address.trim()) return "Введите адрес";
    if (!form.capacity || Number(form.capacity) <= 0) return "Укажите вместимость";
    return null;
  };

  const safeFetch = async (url: string, body: unknown): Promise<Record<string, unknown>> => {
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Ошибка сервера (${res.status})`);
        return data;
      } catch (e) {
        lastErr = e;
        if (attempt === 0) await new Promise(r => setTimeout(r, 800));
      }
    }
    throw lastErr;
  };

  const handleSubmit = async () => {
    if (submittingRef.current) return;
    const validErr = validate();
    if (validErr) { setError(validErr); return; }
    if (!user) { setError("Сессия истекла, войдите заново"); return; }
    submittingRef.current = true;
    setLoading(true);
    setError("");
    try {
      // ─── 1. Сжимаем главное фото (если есть) ──────────────────────────
      const totalSteps = 1 + photos.length + (riderFile ? 1 : 0) + (schemaFile ? 1 : 0);
      let done = 0;
      const tick = (stage: string) => {
        done += 1;
        setProgress({ stage, current: done, total: totalSteps });
      };

      let mainPhoto: { data: string; mime: string } | null = null;
      if (photos.length > 0) {
        setProgress({ stage: "Подготовка фотографии 1...", current: 0, total: totalSteps });
        mainPhoto = await compressImage(photos[0].file);
      } else {
        setProgress({ stage: "Создаём площадку...", current: 0, total: totalSteps });
      }

      // ─── 2. Создаём площадку только с главным фото ────────────────────
      const createPayload: Record<string, unknown> = {
        userId: user.id,
        name: form.name, city: form.city, address: form.address,
        venueType: form.venueType, capacity: Number(form.capacity),
        priceFrom: Number(form.priceFrom) || 0,
        description: form.description, tags: form.tags,
        photosBase64: mainPhoto ? [mainPhoto] : [],
        busyDates: Array.from(busyDates).map(d => ({ date: d, note: "" })),
      };

      setProgress({ stage: "Создаём площадку...", current: done, total: totalSteps });
      const created = await safeFetch(`${VENUES_URL}?action=create`, createPayload);
      const venueId = created.venueId as string;
      tick("Площадка создана");

      // ─── 3. Загружаем остальные фото ПО ОДНОМУ ────────────────────────
      for (let i = 1; i < photos.length; i++) {
        setProgress({ stage: `Загружаем фото ${i + 1} из ${photos.length}...`, current: done, total: totalSteps });
        const compressed = await compressImage(photos[i].file);
        await safeFetch(`${VENUES_URL}?action=add_photos`, {
          venueId, userId: user.id, photosBase64: [compressed],
        });
        tick(`Фото ${i + 1} загружено`);
      }

      // ─── 4. Райдер ────────────────────────────────────────────────────
      if (riderFile) {
        setProgress({ stage: "Загружаем райдер...", current: done, total: totalSteps });
        const riderB64 = await fileToBase64(riderFile);
        await safeFetch(`${VENUES_URL}?action=update`, {
          venueId, userId: user.id,
          riderBase64: riderB64, riderMime: riderFile.type, riderFileName: riderFile.name,
        });
        tick("Райдер загружен");
      }

      // ─── 5. Схема ─────────────────────────────────────────────────────
      if (schemaFile) {
        setProgress({ stage: "Загружаем схему...", current: done, total: totalSteps });
        const schemaB64 = await fileToBase64(schemaFile);
        await safeFetch(`${VENUES_URL}?action=update`, {
          venueId, userId: user.id,
          schemaBase64: schemaB64, schemaMime: schemaFile.type, schemaFileName: schemaFile.name,
        });
        tick("Схема загружена");
      }

      onCreated();
      onClose();

      sendNotification(
        user.id, "venue",
        `Площадка «${form.name}» опубликована!`,
        `Ваша площадка в ${form.city} теперь отображается в поиске.`,
        "search"
      ).catch(() => {});
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : String(e);
      const msg = raw.includes("Failed to fetch")
        ? "Не удалось отправить файлы — проверьте интернет или уменьшите количество/размер фото"
        : raw || "Ошибка при сохранении";
      console.error("[VenueSetupModal] submit error:", e);
      setError(msg);
    } finally {
      setLoading(false);
      setProgress({ stage: "", current: 0, total: 0 });
      submittingRef.current = false;
    }
  };

  const STEPS = ["Основное", "Детали", "Даты", "Медиа"];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl glass-strong rounded-2xl animate-scale-in flex flex-col max-h-[92vh] overflow-hidden" style={{ contain: "layout" }}>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-cyan to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 shrink-0">
          <div>
            <h2 className="font-oswald font-bold text-2xl text-white">Регистрация площадки</h2>
            <p className="text-white/40 text-sm mt-0.5">Шаг {step} из {STEPS.length}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/50 hover:text-white">
            <Icon name="X" size={16} />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 px-6 pb-4 shrink-0">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center gap-1.5 ${i + 1 <= step ? "text-neon-cyan" : "text-white/25"}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${i + 1 < step ? "bg-neon-cyan border-neon-cyan text-background" : i + 1 === step ? "border-neon-cyan text-neon-cyan" : "border-white/20 text-white/25"}`}>
                  {i + 1 < step ? <Icon name="Check" size={12} /> : i + 1}
                </div>
                <span className="text-xs hidden sm:block">{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-px transition-colors ${i + 1 < step ? "bg-neon-cyan/60" : "bg-white/10"}`} />}
            </div>
          ))}
        </div>

        {/* Step content */}
        <VenueStepContent
          step={step}
          form={form}
          onFormChange={handleFormChange}
          busyDates={busyDates}
          onToggleBusyDate={toggleBusyDate}
          photos={photos}
          onAddPhotos={handlePhotos}
          onRemovePhoto={removePhoto}
          onMovePhoto={movePhoto}
          riderFile={riderFile}
          onSetRider={setRiderFile}
          onClearRider={() => setRiderFile(null)}
          schemaFile={schemaFile}
          onSetSchema={setSchemaFile}
          onClearSchema={() => setSchemaFile(null)}
          error={error}
        />

        {/* Footer */}
        <div className="flex flex-col gap-2 px-6 py-4 border-t border-white/10 shrink-0">
          {loading && progress.total > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-white/70">
                <span className="flex items-center gap-2">
                  <Icon name="Loader2" size={12} className="animate-spin text-neon-cyan" />
                  {progress.stage}
                </span>
                <span className="text-white/40">{progress.current}/{progress.total}</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-neon-purple to-neon-cyan transition-all duration-300"
                  style={{ width: `${Math.round((progress.current / progress.total) * 100)}%` }}
                />
              </div>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-neon-pink text-xs bg-neon-pink/10 rounded-xl px-3 py-2 border border-neon-pink/20">
              <Icon name="AlertCircle" size={13} className="shrink-0" />
              {error}
            </div>
          )}
          <div className="flex items-center justify-between">
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
              <button onClick={handleSubmit} disabled={loading || !user}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 text-sm">
                {loading
                  ? <><Icon name="Loader2" size={16} className="animate-spin" />Публикуем...</>
                  : <><Icon name="Check" size={16} />Опубликовать</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}