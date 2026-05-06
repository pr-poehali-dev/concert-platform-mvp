import Icon from "@/components/ui/icon";
import type { PhotoItem } from "@/components/venue-setup/VenueStepContent";

interface Props {
  error: string;
  existingPhotos: string[];
  newPhotos: PhotoItem[];
  riderUrl: string;
  riderFile: File | null;
  riderName: string;
  schemaUrl: string;
  schemaFile: File | null;
  schemaName: string;
  onAddPhotos: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveNewPhoto: (id: string) => void;
  onMoveNewPhoto: (id: string, dir: -1 | 1) => void;
  onRemoveExistingPhoto: (url: string) => void;
  onSetRiderFile: (f: File) => void;
  onClearRider: () => void;
  onSetSchemaFile: (f: File) => void;
  onClearSchema: () => void;
}

export default function VenueEditStepMedia({
  error,
  existingPhotos,
  newPhotos,
  riderUrl,
  riderFile,
  riderName,
  schemaUrl,
  schemaFile,
  schemaName,
  onAddPhotos,
  onRemoveNewPhoto,
  onMoveNewPhoto,
  onRemoveExistingPhoto,
  onSetRiderFile,
  onClearRider,
  onSetSchemaFile,
  onClearSchema,
}: Props) {
  return (
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
                  onClick={() => onRemoveExistingPhoto(url)}
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
                  {i > 0 && <button onClick={() => onMoveNewPhoto(p.id, -1)} className="w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white"><Icon name="ChevronLeft" size={10} /></button>}
                  {i < newPhotos.length - 1 && <button onClick={() => onMoveNewPhoto(p.id, 1)} className="w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white"><Icon name="ChevronRight" size={10} /></button>}
                  <button onClick={() => onRemoveNewPhoto(p.id)} className="w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-neon-pink"><Icon name="X" size={10} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
        <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-white/15 rounded-xl py-6 cursor-pointer hover:border-neon-purple/40 transition-colors">
          <Icon name="ImagePlus" size={24} className="text-white/20" />
          <span className="text-white/40 text-sm">Выберите фотографии</span>
          <input type="file" accept="image/*" multiple className="hidden" onChange={onAddPhotos} />
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
              <button onClick={onClearRider} className="text-neon-pink hover:opacity-80">
                <Icon name="X" size={12} />
              </button>
            </div>
          )}
          <label className="flex items-center gap-2 px-3 py-2 border border-white/10 rounded-xl cursor-pointer hover:border-neon-purple/40 transition-colors text-white/40 hover:text-white/60 text-xs">
            <Icon name="Upload" size={14} />{riderFile ? riderFile.name : "Загрузить новый"}
            <input type="file" accept=".pdf,.doc,.docx" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) { onSetRiderFile(f); } e.target.value = ""; }} />
          </label>
        </div>
        <div>
          <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Схема площадки</p>
          {(schemaUrl || schemaFile) && (
            <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 mb-2 border border-white/10">
              <Icon name="Map" size={14} className="text-neon-purple shrink-0" />
              <span className="text-white/60 text-xs truncate flex-1">{schemaFile?.name || schemaName || "Текущая схема"}</span>
              <button onClick={onClearSchema} className="text-neon-pink hover:opacity-80">
                <Icon name="X" size={12} />
              </button>
            </div>
          )}
          <label className="flex items-center gap-2 px-3 py-2 border border-white/10 rounded-xl cursor-pointer hover:border-neon-purple/40 transition-colors text-white/40 hover:text-white/60 text-xs">
            <Icon name="Upload" size={14} />{schemaFile ? schemaFile.name : "Загрузить новую"}
            <input type="file" accept=".pdf,.jpg,.png" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) { onSetSchemaFile(f); } e.target.value = ""; }} />
          </label>
        </div>
      </div>
    </div>
  );
}
