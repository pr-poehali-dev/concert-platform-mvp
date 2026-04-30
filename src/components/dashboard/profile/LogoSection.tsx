import Icon from "@/components/ui/icon";
import type { User } from "@/context/AuthContext";
import { AUTH_URL } from "./types";

interface Props {
  user: User;
  logoPreview: string;
  logoFile: File | null;
  logoSaving: boolean;
  onLogoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSaveLogo: () => void;
  onDeleteLogo: () => void;
}

export default function LogoSection({
  user, logoPreview, logoFile, logoSaving,
  onLogoChange, onSaveLogo, onDeleteLogo,
}: Props) {
  return (
    <div className="glass rounded-2xl p-6 space-y-5">
      <h3 className="font-oswald font-bold text-white text-xl mb-1">Логотип компании</h3>
      <p className="text-white/65 text-sm">Логотип отображается в личном кабинете, экспортируемых отчётах и карточке площадки.</p>

      <div className="flex items-start gap-6">
        <div className="shrink-0">
          {logoPreview ? (
            <img src={logoPreview} alt="logo" className="w-24 h-24 rounded-2xl object-cover border border-white/10" />
          ) : (
            <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${user.avatarColor} flex items-center justify-center font-oswald font-bold text-3xl text-white border border-white/10`}>
              {user.avatar}
            </div>
          )}
        </div>
        <div className="flex-1 space-y-3">
          <label className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-white/15 hover:border-white/30 cursor-pointer transition-colors">
            <Icon name="ImagePlus" size={20} className="text-white/55" />
            <div>
              <p className="text-white/70 text-sm">Загрузить логотип</p>
              <p className="text-white/25 text-xs">PNG, JPG, SVG · рекомендуем 400×400</p>
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={onLogoChange} />
          </label>
          {logoFile && (
            <button onClick={onSaveLogo} disabled={logoSaving}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 text-sm">
              {logoSaving ? <><Icon name="Loader2" size={15} className="animate-spin" />Загружаем...</> : <><Icon name="Upload" size={15} />Сохранить логотип</>}
            </button>
          )}
          {user.logoUrl && !logoFile && (
            <button onClick={onDeleteLogo}
              className="flex items-center gap-2 text-neon-pink text-sm hover:text-white transition-colors">
              <Icon name="Trash2" size={13} />Удалить логотип
            </button>
          )}
        </div>
      </div>
    </div>
  );
}