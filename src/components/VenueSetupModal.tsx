import { useState, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationsContext";
import VenueStepContent, { type VenueForm, type PhotoItem } from "@/components/venue-setup/VenueStepContent";

const VENUES_URL = "https://functions.poehali.dev/9f704d9c-5798-4fde-8263-7e036dae1545";

interface VenueSetupModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res((r.result as string).split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export default function VenueSetupModal({ open, onClose, onCreated }: VenueSetupModalProps) {
  const { user } = useAuth();
  const { sendNotification } = useNotifications();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  const handleSubmit = async () => {
    const validErr = validate();
    if (validErr) { setError(validErr); return; }
    setLoading(true);
    setError("");
    try {
      // Конвертируем фото в base64
      const photosBase64 = await Promise.all(
        photos.map(async p => ({
          data: await fileToBase64(p.file),
          mime: p.file.type || "image/jpeg",
        }))
      );

      const payload: Record<string, unknown> = {
        userId: user!.id,
        name: form.name, city: form.city, address: form.address,
        venueType: form.venueType, capacity: Number(form.capacity),
        priceFrom: Number(form.priceFrom) || 0,
        description: form.description, tags: form.tags,
        photosBase64,
        busyDates: Array.from(busyDates).map(d => ({ date: d, note: "" })),
      };

      if (riderFile) {
        payload.riderBase64 = await fileToBase64(riderFile);
        payload.riderMime = riderFile.type;
        payload.riderFileName = riderFile.name;
      }
      if (schemaFile) {
        payload.schemaBase64 = await fileToBase64(schemaFile);
        payload.schemaMime = schemaFile.type;
        payload.schemaFileName = schemaFile.name;
      }

      const res = await fetch(`${VENUES_URL}?action=create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");

      onCreated();
      onClose();

      if (user) {
        sendNotification(
          user.id, "venue",
          `Площадка «${form.name}» опубликована!`,
          `Ваша площадка в ${form.city} теперь отображается в поиске.`,
          "search"
        ).catch(() => {});
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Ошибка при сохранении";
      console.error("[VenueSetupModal] submit error:", e);
      setError(msg);
    } finally {
      setLoading(false);
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