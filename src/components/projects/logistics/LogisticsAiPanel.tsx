import { useRef } from "react";
import Icon from "@/components/ui/icon";
import { LogType, LogItem, TYPE_CONFIG } from "./logistics.types";

interface Props {
  form: Omit<LogItem, "id" | "projectId" | "createdAt">;
  projectId: string;
  aiLoading: boolean;
  aiAdvice: string | null;
  onAsk: () => void;
  onClear: () => void;
}

export default function LogisticsAiPanel({ form, projectId, aiLoading, aiAdvice, onAsk, onClear }: Props) {
  const aiRef = useRef<HTMLDivElement>(null);

  return (
    <div className="rounded-2xl border border-neon-cyan/20 bg-neon-cyan/5 overflow-hidden">
      <button
        type="button"
        onClick={onAsk}
        disabled={aiLoading || (!form.routeTo && !form.routeFrom)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 disabled:opacity-50 transition-all group"
      >
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center shrink-0">
          {aiLoading
            ? <Icon name="Loader2" size={16} className="text-white animate-spin" />
            : <Icon name="Sparkles" size={16} className="text-white" />
          }
        </div>
        <div className="text-left flex-1">
          <p className="text-white text-sm font-semibold">
            {aiLoading ? "ИИ подбирает варианты..." : "Спросить ИИ-ассистента"}
          </p>
          <p className="text-white/40 text-xs">
            {aiLoading
              ? "Анализирую маршрут и даты"
              : form.routeTo || form.routeFrom
                ? `Советы по ${TYPE_CONFIG[form.type].label.toLowerCase()} ${form.routeFrom ? `${form.routeFrom} → ` : ""}${form.routeTo}`
                : "Заполните маршрут для получения советов"
            }
          </p>
        </div>
        {!aiLoading && (form.routeTo || form.routeFrom) && (
          <Icon name="ChevronRight" size={16} className="text-neon-cyan/50 group-hover:translate-x-0.5 transition-transform" />
        )}
      </button>

      {aiAdvice && (
        <div ref={aiRef} className="border-t border-neon-cyan/10 px-4 py-4 animate-fade-in">
          <div className="flex items-start gap-2 mb-2">
            <Icon name="Bot" size={14} className="text-neon-cyan mt-0.5 shrink-0" />
            <p className="text-neon-cyan text-xs font-medium">Рекомендация ИИ</p>
            <button onClick={onClear} className="ml-auto text-white/20 hover:text-white/50 transition-colors">
              <Icon name="X" size={12} />
            </button>
          </div>
          <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{aiAdvice}</p>
          {(form.routeFrom || form.routeTo) && (
            <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap gap-2">
              <p className="text-white/30 text-xs w-full mb-1">Найти и купить:</p>
              <a
                href={TYPE_CONFIG[form.type].search({ ...form, id: "", projectId, createdAt: "" } as LogItem)}
                target="_blank" rel="noreferrer"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border transition-all ${TYPE_CONFIG[form.type].color} bg-white/5 border-white/10 hover:bg-white/10`}
              >
                <Icon name="ExternalLink" size={12} />
                {form.type === "flight" ? "Авиасейлс" : form.type === "train" ? "РЖД" : "Островок"}
              </a>
              {form.type === "flight" && (
                <a
                  href={`https://www.ozon.ru/travel/flights/?fromCity=${encodeURIComponent(form.routeFrom)}&toCity=${encodeURIComponent(form.routeTo)}&date=${form.dateDepart || ""}`}
                  target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border text-white/50 bg-white/5 border-white/10 hover:bg-white/10 transition-all"
                >
                  <Icon name="ExternalLink" size={12} />
                  Ozon Travel
                </a>
              )}
              {form.type === "hotel" && (
                <a
                  href={`https://travel.yandex.ru/hotels/?adults=1&checkinDate=${form.dateDepart || ""}&checkoutDate=${form.dateReturn || ""}&geoId=${encodeURIComponent(form.routeTo || form.routeFrom)}`}
                  target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border text-white/50 bg-white/5 border-white/10 hover:bg-white/10 transition-all"
                >
                  <Icon name="ExternalLink" size={12} />
                  Яндекс Отели
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
