import Icon from "@/components/ui/icon";
import VenueInlineCalendar from "./VenueInlineCalendar";
import VenueFileUploadBlock from "./VenueFileUploadBlock";

const CITIES = ["Москва","Санкт-Петербург","Екатеринбург","Новосибирск","Казань","Ростов-на-Дону","Краснодар","Воронеж","Самара","Уфа","Нижний Новгород","Омск","Челябинск","Красноярск"];
const VENUE_TYPES = ["Клуб","Концертный зал","Театр","Арена","Площадка на открытом воздухе","Бар","Ресторан","Арт-пространство"];
const ALL_TAGS = ["Свет","Звук","Гримёрки","VIP","Бар","Парковка","Сцена","Монитор","Пресс-зона","Гардероб","Терраса","LED экран","Стриминг","Wi-Fi"];

export interface VenueForm {
  name: string;
  city: string;
  address: string;
  venueType: string;
  capacity: string;
  priceFrom: string;
  description: string;
  tags: string[];
}

export interface PhotoItem {
  file: File;
  preview: string;
  id: string;
}

interface VenueStepContentProps {
  step: number;
  form: VenueForm;
  onFormChange: (key: string, val: unknown) => void;
  busyDates: Set<string>;
  onToggleBusyDate: (d: string) => void;
  photos: PhotoItem[];
  onAddPhotos: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: (id: string) => void;
  onMovePhoto: (id: string, dir: -1 | 1) => void;
  riderFile: File | null;
  onSetRider: (f: File) => void;
  onClearRider: () => void;
  schemaFile: File | null;
  onSetSchema: (f: File) => void;
  onClearSchema: () => void;
  error: string;
}

export default function VenueStepContent({
  step,
  form,
  onFormChange,
  busyDates,
  onToggleBusyDate,
  photos,
  onAddPhotos,
  onRemovePhoto,
  onMovePhoto,
  riderFile,
  onSetRider,
  onClearRider,
  schemaFile,
  onSetSchema,
  onClearSchema,
  error,
}: VenueStepContentProps) {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin px-6 pb-2">

      {/* ── STEP 1: Основное ── */}
      {step === 1 && (
        <div className="space-y-4 animate-fade-in">
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Название площадки *</label>
            <input value={form.name} onChange={e => onFormChange("name", e.target.value)}
              placeholder="Например: Volta, ГлавClub, Arena"
              className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-cyan/50 transition-colors text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Город *</label>
              <select value={form.city} onChange={e => onFormChange("city", e.target.value)}
                className="w-full glass rounded-xl px-4 py-3 text-white outline-none border border-white/10 focus:border-neon-cyan/50 transition-colors text-sm appearance-none bg-transparent">
                {CITIES.map(c => <option key={c} value={c} className="bg-gray-900">{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Тип площадки</label>
              <select value={form.venueType} onChange={e => onFormChange("venueType", e.target.value)}
                className="w-full glass rounded-xl px-4 py-3 text-white outline-none border border-white/10 focus:border-neon-cyan/50 transition-colors text-sm appearance-none bg-transparent">
                {VENUE_TYPES.map(t => <option key={t} value={t} className="bg-gray-900">{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Адрес *</label>
            <input value={form.address} onChange={e => onFormChange("address", e.target.value)}
              placeholder="ул. Ленина, 10"
              className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-cyan/50 transition-colors text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Вместимость (чел.) *</label>
              <input type="number" value={form.capacity} onChange={e => onFormChange("capacity", e.target.value)} placeholder="500"
                className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-cyan/50 transition-colors text-sm" />
            </div>
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Стоимость от (₽)</label>
              <input type="number" value={form.priceFrom} onChange={e => onFormChange("priceFrom", e.target.value)} placeholder="50000"
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
            <textarea value={form.description} onChange={e => onFormChange("description", e.target.value)}
              placeholder="Расскажите об оборудовании, атмосфере, особенностях площадки..."
              rows={4}
              className="w-full glass rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-neon-cyan/50 transition-colors text-sm resize-none" />
          </div>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">Удобства и оснащение</label>
            <div className="flex flex-wrap gap-2">
              {ALL_TAGS.map(tag => (
                <button key={tag} type="button"
                  onClick={() => onFormChange("tags", form.tags.includes(tag) ? form.tags.filter(t => t !== tag) : [...form.tags, tag])}
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
          <VenueInlineCalendar selected={busyDates} onToggle={onToggleBusyDate} />

          {busyDates.size > 0 && (
            <div className="glass rounded-xl p-3">
              <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Занятые даты</p>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto scrollbar-thin">
                {Array.from(busyDates).sort().map(d => (
                  <button key={d} onClick={() => onToggleBusyDate(d)}
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
                        <button onClick={() => onMovePhoto(p.id, -1)} className="w-6 h-6 bg-white/20 rounded-md flex items-center justify-center text-white hover:bg-white/40 transition-colors">
                          <Icon name="ChevronLeft" size={12} />
                        </button>
                      )}
                      <button onClick={() => onRemovePhoto(p.id)} className="w-6 h-6 bg-neon-pink/70 rounded-md flex items-center justify-center text-white hover:bg-neon-pink transition-colors">
                        <Icon name="X" size={12} />
                      </button>
                      {idx < photos.length - 1 && (
                        <button onClick={() => onMovePhoto(p.id, 1)} className="w-6 h-6 bg-white/20 rounded-md flex items-center justify-center text-white hover:bg-white/40 transition-colors">
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
                <input type="file" accept="image/*" multiple className="hidden" onChange={onAddPhotos} />
              </label>
            )}
          </div>

          {/* Технический райдер */}
          <VenueFileUploadBlock
            label="Технический райдер"
            accept=".pdf,.doc,.docx,.xlsx,.xls"
            hint="Загрузить технический райдер"
            file={riderFile}
            onChange={onSetRider}
            onClear={onClearRider}
            icon="FileText"
            color="border-neon-purple/50"
          />

          {/* Схема площадки */}
          <VenueFileUploadBlock
            label="Схема площадки"
            accept=".pdf,.png,.jpg,.jpeg,.dwg,.svg"
            hint="Схема зала, план расстановки"
            file={schemaFile}
            onChange={onSetSchema}
            onClear={onClearSchema}
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
  );
}
