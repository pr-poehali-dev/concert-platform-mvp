import { useState, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationsContext";

const VENUES_URL = "https://functions.poehali.dev/9f704d9c-5798-4fde-8263-7e036dae1545";

const CITIES = ["Москва","Санкт-Петербург","Екатеринбург","Новосибирск","Казань","Ростов-на-Дону","Краснодар","Воронеж","Самара","Уфа","Нижний Новгород","Омск","Челябинск","Красноярск"];
const VENUE_TYPES = ["Клуб","Концертный зал","Театр","Арена","Площадка на открытом воздухе","Бар","Ресторан","Арт-пространство"];
const ALL_TAGS = ["Свет","Звук","Гримёрки","VIP","Бар","Парковка","Сцена","Монитор","Пресс-зона","Гардероб","Терраса","LED экран","Стриминг","Wi-Fi"];
const MONTHS_RU = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const DAYS_RU = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];

interface VenueSetupModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

interface PhotoItem {
  file: File;
  preview: string;
  id: string;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res((r.result as string).split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// ─── Инлайн-календарь ────────────────────────────────────────────────────────
function InlineCalendar({ selected, onToggle }: { selected: Set<string>; onToggle: (d: string) => void }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const firstDay = new Date(year, month, 1).getDay(); // 0=вс..6=сб
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Пн=0..Вс=6
  const startOffset = (firstDay + 6) % 7;

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Дополняем до кратности 7
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="glass rounded-2xl p-4 select-none">
      {/* Nav */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors">
          <Icon name="ChevronLeft" size={16} />
        </button>
        <span className="font-oswald font-semibold text-white text-sm">
          {MONTHS_RU[month]} {year}
        </span>
        <button onClick={nextMonth} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors">
          <Icon name="ChevronRight" size={16} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS_RU.map(d => (
          <div key={d} className={`text-center text-xs py-1 font-medium ${d === "Сб" || d === "Вс" ? "text-neon-pink/60" : "text-white/30"}`}>
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} />;
          const ds = toDateStr(year, month, day);
          const isBusy = selected.has(ds);
          const isPast = ds < todayStr;
          const isToday = ds === todayStr;
          const dow = (startOffset + day - 1) % 7;
          const isWeekend = dow === 5 || dow === 6;

          return (
            <button
              key={idx}
              onClick={() => !isPast && onToggle(ds)}
              disabled={isPast}
              className={`
                w-full aspect-square rounded-lg text-xs font-medium transition-all
                ${isPast ? "text-white/15 cursor-not-allowed" : "cursor-pointer hover:scale-105"}
                ${isBusy ? "bg-neon-pink text-white shadow-lg shadow-neon-pink/30 ring-1 ring-neon-pink/50" :
                  isToday ? "ring-1 ring-neon-cyan/60 text-neon-cyan bg-neon-cyan/10" :
                  isWeekend && !isPast ? "text-neon-pink/70 hover:bg-neon-pink/15" :
                  !isPast ? "text-white/70 hover:bg-white/10" : ""}
              `}
            >
              {day}
            </button>
          );
        })}
      </div>

      {selected.size > 0 && (
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-neon-pink">
            Отмечено: {selected.size} {selected.size === 1 ? "дата" : selected.size < 5 ? "даты" : "дат"}
          </span>
          <button onClick={() => selected.forEach(d => onToggle(d))}
            className="text-xs text-white/30 hover:text-white transition-colors">
            Очистить всё
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Загрузка файла ───────────────────────────────────────────────────────────
function FileUploadBlock({
  label, accept, hint, file, onChange, onClear, icon, color,
}: {
  label: string; accept: string; hint: string;
  file: File | null; onChange: (f: File) => void; onClear: () => void;
  icon: string; color: string;
}) {
  return (
    <div>
      <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">{label}</label>
      <label className={`flex items-center gap-4 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${file ? `${color} bg-white/3` : "border-white/15 hover:border-white/30"}`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${file ? "bg-white/10" : "bg-white/5"}`}>
          <Icon name={icon} size={20} className={file ? "text-white/80" : "text-white/30"} />
        </div>
        <div className="flex-1 min-w-0">
          {file ? (
            <>
              <p className="text-white text-sm font-medium truncate">{file.name}</p>
              <p className="text-white/40 text-xs">{(file.size / 1024).toFixed(0)} КБ</p>
            </>
          ) : (
            <>
              <p className="text-white/50 text-sm">{hint}</p>
              <p className="text-white/25 text-xs">до 20 МБ</p>
            </>
          )}
        </div>
        {file && (
          <button type="button" onClick={e => { e.preventDefault(); onClear(); }}
            className="text-white/30 hover:text-neon-pink transition-colors shrink-0">
            <Icon name="X" size={16} />
          </button>
        )}
        <input type="file" accept={accept} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onChange(f); }} />
      </label>
    </div>
  );
}

// ─── Главный компонент ────────────────────────────────────────────────────────
export default function VenueSetupModal({ open, onClose, onCreated }: VenueSetupModalProps) {
  const { user } = useAuth();
  const { sendNotification } = useNotifications();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "", city: "Москва", address: "", venueType: "Клуб",
    capacity: "", priceFrom: "", description: "", tags: [] as string[],
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

  const set = (key: string, val: unknown) => setForm(f => ({ ...f, [key]: val }));

  const toggleTag = (tag: string) => {
    set("tags", form.tags.includes(tag) ? form.tags.filter(t => t !== tag) : [...form.tags, tag]);
  };

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

      if (user) {
        await sendNotification(
          user.id, "venue",
          `Площадка «${form.name}» опубликована!`,
          `Ваша площадка в ${form.city} теперь отображается в поиске.`,
          "search"
        );
      }
      onCreated();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка при сохранении");
    } finally {
      setLoading(false);
    }
  };

  const STEPS = ["Основное", "Детали", "Даты", "Медиа"];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl glass-strong rounded-2xl overflow-hidden animate-scale-in flex flex-col max-h-[92vh]">
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 pb-2">

          {/* ── STEP 1: Основное ── */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Название площадки *</label>
                <input value={form.name} onChange={e => set("name", e.target.value)}
                  placeholder="Например: Volta, ГлавClub, Arena"
                  className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-cyan/50 transition-colors text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Город *</label>
                  <select value={form.city} onChange={e => set("city", e.target.value)}
                    className="w-full glass rounded-xl px-4 py-3 text-white outline-none border border-white/10 focus:border-neon-cyan/50 transition-colors text-sm appearance-none bg-transparent">
                    {CITIES.map(c => <option key={c} value={c} className="bg-gray-900">{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Тип площадки</label>
                  <select value={form.venueType} onChange={e => set("venueType", e.target.value)}
                    className="w-full glass rounded-xl px-4 py-3 text-white outline-none border border-white/10 focus:border-neon-cyan/50 transition-colors text-sm appearance-none bg-transparent">
                    {VENUE_TYPES.map(t => <option key={t} value={t} className="bg-gray-900">{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Адрес *</label>
                <input value={form.address} onChange={e => set("address", e.target.value)}
                  placeholder="ул. Ленина, 10"
                  className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-cyan/50 transition-colors text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Вместимость (чел.) *</label>
                  <input type="number" value={form.capacity} onChange={e => set("capacity", e.target.value)} placeholder="500"
                    className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-cyan/50 transition-colors text-sm" />
                </div>
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Стоимость от (₽)</label>
                  <input type="number" value={form.priceFrom} onChange={e => set("priceFrom", e.target.value)} placeholder="50000"
                    className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-cyan/50 transition-colors text-sm" />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Детали ── */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Описание</label>
                <textarea value={form.description} onChange={e => set("description", e.target.value)}
                  placeholder="Расскажите об оборудовании, атмосфере, особенностях площадки..."
                  rows={4}
                  className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-cyan/50 transition-colors text-sm resize-none" />
              </div>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">Удобства и оснащение</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_TAGS.map(tag => (
                    <button key={tag} type="button" onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${form.tags.includes(tag) ? "bg-neon-cyan/20 border-neon-cyan/60 text-neon-cyan" : "bg-white/5 border-white/10 text-white/50 hover:border-white/30 hover:text-white"}`}>
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Занятые даты — КАЛЕНДАРЬ ── */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <p className="text-white/60 text-sm mb-1">Нажмите на дату чтобы отметить её как занятую. Нажмите снова — чтобы снять.</p>
                {busyDates.size > 0 && (
                  <p className="text-neon-pink text-xs">Выбрано {busyDates.size} {busyDates.size === 1 ? "дата" : busyDates.size < 5 ? "даты" : "дат"} — организаторы увидят их в календаре</p>
                )}
              </div>
              <InlineCalendar selected={busyDates} onToggle={toggleBusyDate} />

              {busyDates.size > 0 && (
                <div className="glass rounded-xl p-3">
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Занятые даты</p>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto scrollbar-thin">
                    {Array.from(busyDates).sort().map(d => (
                      <button key={d} onClick={() => toggleBusyDate(d)}
                        className="flex items-center gap-1 px-2 py-1 bg-neon-pink/15 text-neon-pink text-xs rounded-lg border border-neon-pink/30 hover:bg-neon-pink/25 transition-colors">
                        {new Date(d + "T00:00:00").toLocaleDateString("ru", { day: "numeric", month: "short" })}
                        <Icon name="X" size={10} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 4: Медиа ── */}
          {step === 4 && (
            <div className="space-y-5 animate-fade-in">
              {/* Фотографии — мультизагрузка */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-white/40 uppercase tracking-wider">Фотографии площадки</label>
                  <span className="text-xs text-white/30">{photos.length}/10</span>
                </div>

                {photos.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {photos.map((p, idx) => (
                      <div key={p.id} className="relative group aspect-square rounded-xl overflow-hidden">
                        <img src={p.preview} alt="" className="w-full h-full object-cover" />
                        {idx === 0 && (
                          <div className="absolute top-1 left-1 bg-neon-cyan/80 text-background text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                            Главное
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                          {idx > 0 && (
                            <button onClick={() => movePhoto(p.id, -1)} className="w-6 h-6 bg-white/20 rounded-md flex items-center justify-center text-white hover:bg-white/40 transition-colors">
                              <Icon name="ChevronLeft" size={12} />
                            </button>
                          )}
                          <button onClick={() => removePhoto(p.id)} className="w-6 h-6 bg-neon-pink/70 rounded-md flex items-center justify-center text-white hover:bg-neon-pink transition-colors">
                            <Icon name="X" size={12} />
                          </button>
                          {idx < photos.length - 1 && (
                            <button onClick={() => movePhoto(p.id, 1)} className="w-6 h-6 bg-white/20 rounded-md flex items-center justify-center text-white hover:bg-white/40 transition-colors">
                              <Icon name="ChevronRight" size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {photos.length < 10 && (
                  <label className={`flex items-center justify-center gap-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors p-4 ${photos.length > 0 ? "border-white/10 hover:border-white/25" : "border-white/15 hover:border-white/30"}`}>
                    <Icon name="ImagePlus" size={20} className="text-white/30" />
                    <div>
                      <p className="text-white/50 text-sm">Добавить фотографии</p>
                      <p className="text-white/25 text-xs">JPG, PNG, WEBP · до 10 МБ каждая</p>
                    </div>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotos} />
                  </label>
                )}
              </div>

              {/* Технический райдер */}
              <FileUploadBlock
                label="Технический райдер"
                accept=".pdf,.doc,.docx,.xlsx,.xls"
                hint="Загрузить технический райдер"
                file={riderFile}
                onChange={setRiderFile}
                onClear={() => setRiderFile(null)}
                icon="FileText"
                color="border-neon-purple/50"
              />

              {/* Схема площадки */}
              <FileUploadBlock
                label="Схема площадки"
                accept=".pdf,.png,.jpg,.jpeg,.dwg,.svg"
                hint="Схема зала, план расстановки"
                file={schemaFile}
                onChange={setSchemaFile}
                onClear={() => setSchemaFile(null)}
                icon="Map"
                color="border-neon-cyan/50"
              />

              {/* Итог */}
              <div className="glass rounded-xl p-4">
                <h3 className="font-oswald font-semibold text-white mb-2 flex items-center gap-2">
                  <Icon name="CheckCircle" size={16} className="text-neon-green" />Готово к публикации
                </h3>
                <div className="space-y-1.5">
                  {([
                    [form.name, "Название: " + form.name],
                    [form.city, "Город: " + form.city],
                    [form.capacity, "Вместимость: " + form.capacity + " чел."],
                    [busyDates.size > 0, `Занятых дат: ${busyDates.size}`],
                    [photos.length > 0, `Фотографий: ${photos.length}`],
                    [riderFile, "Райдер: " + (riderFile?.name || "")],
                    [schemaFile, "Схема: " + (schemaFile?.name || "")],
                  ] as [unknown, string][]).map(([cond, label], i) => (
                    <div key={i} className={`flex items-center gap-2 text-sm ${cond ? "text-white/70" : "text-white/25 line-through"}`}>
                      <Icon name={cond ? "Check" : "Minus"} size={13} className={cond ? "text-neon-green" : "text-white/20"} />
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-center gap-2 text-neon-pink text-sm bg-neon-pink/10 rounded-xl px-4 py-3 border border-neon-pink/20">
              <Icon name="AlertCircle" size={14} />
              {error}
            </div>
          )}
        </div>

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
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 text-sm">
              {loading
                ? <><Icon name="Loader2" size={16} className="animate-spin" />Публикуем...</>
                : <><Icon name="Check" size={16} />Опубликовать</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
