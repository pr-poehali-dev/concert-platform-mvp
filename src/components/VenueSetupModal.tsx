import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationsContext";

const VENUES_URL = "https://functions.poehali.dev/9f704d9c-5798-4fde-8263-7e036dae1545";

const CITIES = ["Москва","Санкт-Петербург","Екатеринбург","Новосибирск","Казань","Ростов-на-Дону","Краснодар","Воронеж","Самара","Уфа","Нижний Новгород","Омск","Челябинск","Красноярск"];
const VENUE_TYPES = ["Клуб","Концертный зал","Театр","Арена","Площадка на открытом воздухе","Бар","Ресторан","Арт-пространство"];
const ALL_TAGS = ["Свет","Звук","Гримёрки","VIP","Бар","Парковка","Сцена","Монитор","Пресс-зона","Гардероб","Терраса","LED экран","Стриминг","Wi-Fi"];

interface VenueSetupModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res((reader.result as string).split(",")[1]);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

export default function VenueSetupModal({ open, onClose, onCreated }: VenueSetupModalProps) {
  const { user } = useAuth();
  const { sendNotification } = useNotifications();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "", city: "Москва", address: "", venueType: "Клуб",
    capacity: "", priceFrom: "", description: "", tags: [] as string[],
    busyDates: [] as { date: string; note: string }[],
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [riderFile, setRiderFile] = useState<File | null>(null);
  const [newDate, setNewDate] = useState({ date: "", note: "" });

  if (!open) return null;

  const set = (key: string, val: unknown) => setForm(f => ({ ...f, [key]: val }));

  const toggleTag = (tag: string) => {
    set("tags", form.tags.includes(tag) ? form.tags.filter(t => t !== tag) : [...form.tags, tag]);
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleRider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setRiderFile(file);
  };

  const addDate = () => {
    if (!newDate.date) return;
    set("busyDates", [...form.busyDates, { ...newDate }]);
    setNewDate({ date: "", note: "" });
  };

  const removeDate = (i: number) => {
    set("busyDates", form.busyDates.filter((_, idx) => idx !== i));
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
      const payload: Record<string, unknown> = {
        userId: user!.id,
        name: form.name, city: form.city, address: form.address,
        venueType: form.venueType, capacity: Number(form.capacity),
        priceFrom: Number(form.priceFrom) || 0,
        description: form.description, tags: form.tags,
        busyDates: form.busyDates,
      };
      if (photoFile) {
        payload.photoBase64 = await fileToBase64(photoFile);
        payload.photoMime = photoFile.type;
      }
      if (riderFile) {
        payload.riderBase64 = await fileToBase64(riderFile);
        payload.riderMime = riderFile.type;
        payload.riderFileName = riderFile.name;
      }
      const res = await fetch(`${VENUES_URL}?action=create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      // Уведомление владельцу о публикации площадки
      if (user) {
        await sendNotification(
          user.id,
          "venue",
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
      <div className="relative z-10 w-full max-w-2xl glass-strong rounded-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-cyan to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
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
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${i + 1 < step ? "bg-neon-cyan border-neon-cyan text-background" : i + 1 === step ? "border-neon-cyan text-neon-cyan" : "border-white/20 text-white/25"}`}>
                  {i + 1 < step ? <Icon name="Check" size={12} /> : i + 1}
                </div>
                <span className="text-xs hidden sm:block">{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-px ${i + 1 < step ? "bg-neon-cyan/60" : "bg-white/10"}`} />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 pb-4">

          {/* STEP 1: Основное */}
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
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Тип площадки *</label>
                  <select value={form.venueType} onChange={e => set("venueType", e.target.value)}
                    className="w-full glass rounded-xl px-4 py-3 text-white outline-none border border-white/10 focus:border-neon-cyan/50 transition-colors text-sm appearance-none bg-transparent">
                    {VENUE_TYPES.map(t => <option key={t} value={t} className="bg-gray-900">{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Адрес *</label>
                <input value={form.address} onChange={e => set("address", e.target.value)}
                  placeholder="ул. Ленина, 10, Москва"
                  className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-cyan/50 transition-colors text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Вместимость (чел.) *</label>
                  <input type="number" value={form.capacity} onChange={e => set("capacity", e.target.value)}
                    placeholder="500"
                    className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-cyan/50 transition-colors text-sm" />
                </div>
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Стоимость от (₽)</label>
                  <input type="number" value={form.priceFrom} onChange={e => set("priceFrom", e.target.value)}
                    placeholder="50000"
                    className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-cyan/50 transition-colors text-sm" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Детали */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Описание площадки</label>
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

          {/* STEP 3: Занятые даты */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <p className="text-white/50 text-sm">Укажите даты, когда площадка уже занята — организаторы будут видеть это в календаре.</p>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Дата</label>
                  <input type="date" value={newDate.date} onChange={e => setNewDate(d => ({ ...d, date: e.target.value }))}
                    className="w-full glass rounded-xl px-4 py-3 text-white outline-none border border-white/10 focus:border-neon-cyan/50 transition-colors text-sm [color-scheme:dark]" />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Заметка (необязательно)</label>
                  <input value={newDate.note} onChange={e => setNewDate(d => ({ ...d, note: e.target.value }))}
                    placeholder="Корпоратив, частное мероприятие..."
                    className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-cyan/50 transition-colors text-sm" />
                </div>
                <button onClick={addDate} disabled={!newDate.date}
                  className="h-11 px-4 rounded-xl bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40 hover:bg-neon-cyan/30 transition-colors disabled:opacity-30">
                  <Icon name="Plus" size={18} />
                </button>
              </div>

              {form.busyDates.length > 0 ? (
                <div className="space-y-2">
                  {form.busyDates.map((d, i) => (
                    <div key={i} className="flex items-center gap-3 glass rounded-xl px-4 py-3">
                      <Icon name="Calendar" size={15} className="text-neon-pink shrink-0" />
                      <span className="text-white text-sm font-medium">{d.date}</span>
                      {d.note && <span className="text-white/40 text-sm flex-1">{d.note}</span>}
                      <button onClick={() => removeDate(i)} className="text-white/30 hover:text-neon-pink transition-colors ml-auto">
                        <Icon name="X" size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 glass rounded-xl">
                  <Icon name="CalendarOff" size={32} className="text-white/20 mx-auto mb-2" />
                  <p className="text-white/30 text-sm">Занятых дат пока нет</p>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Медиа */}
          {step === 4 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">Фотография площадки</label>
                <label className={`block cursor-pointer rounded-2xl border-2 border-dashed transition-colors overflow-hidden ${photoPreview ? "border-neon-cyan/40" : "border-white/15 hover:border-white/30"}`}>
                  {photoPreview ? (
                    <div className="relative h-48">
                      <img src={photoPreview} className="w-full h-full object-cover" alt="preview" />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <span className="text-white text-sm">Изменить фото</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                        <Icon name="Image" size={22} className="text-white/30" />
                      </div>
                      <p className="text-white/40 text-sm">Нажмите для загрузки</p>
                      <p className="text-white/20 text-xs">JPG, PNG, WEBP · до 10 МБ</p>
                    </div>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
                </label>
              </div>

              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">Технический райдер</label>
                <label className={`flex items-center gap-4 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${riderFile ? "border-neon-purple/50 bg-neon-purple/5" : "border-white/15 hover:border-white/30"}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${riderFile ? "bg-neon-purple/20" : "bg-white/5"}`}>
                    <Icon name="FileText" size={20} className={riderFile ? "text-neon-purple" : "text-white/30"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    {riderFile ? (
                      <>
                        <p className="text-white text-sm font-medium truncate">{riderFile.name}</p>
                        <p className="text-white/40 text-xs">{(riderFile.size / 1024).toFixed(0)} КБ</p>
                      </>
                    ) : (
                      <>
                        <p className="text-white/50 text-sm">Загрузить технический райдер</p>
                        <p className="text-white/25 text-xs">PDF, DOC, DOCX · до 20 МБ</p>
                      </>
                    )}
                  </div>
                  {riderFile && (
                    <button type="button" onClick={e => { e.preventDefault(); setRiderFile(null); }}
                      className="text-white/30 hover:text-neon-pink transition-colors">
                      <Icon name="X" size={16} />
                    </button>
                  )}
                  <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleRider} />
                </label>
              </div>

              <div className="glass rounded-xl p-4">
                <h3 className="font-oswald font-semibold text-white mb-2 flex items-center gap-2">
                  <Icon name="CheckCircle" size={16} className="text-neon-green" />
                  Готово к публикации
                </h3>
                <div className="space-y-1.5">
                  {[
                    [form.name, "Название: " + form.name],
                    [form.city, "Город: " + form.city],
                    [form.capacity, "Вместимость: " + form.capacity + " чел."],
                    [form.tags.length > 0, "Удобства: " + form.tags.join(", ")],
                    [photoFile, "Фото загружено"],
                    [riderFile, "Райдер загружен"],
                  ].map(([cond, label], i) => (
                    <div key={i} className={`flex items-center gap-2 text-sm ${cond ? "text-white/70" : "text-white/25 line-through"}`}>
                      <Icon name={cond ? "Check" : "Minus"} size={13} className={cond ? "text-neon-green" : "text-white/20"} />
                      {label as string}
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
              Далее
              <Icon name="ChevronRight" size={16} />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 text-sm">
              {loading ? <><Icon name="Loader2" size={16} className="animate-spin" /> Публикуем...</> : <><Icon name="Check" size={16} /> Опубликовать</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}