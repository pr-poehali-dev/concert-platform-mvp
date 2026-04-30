import Icon from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import type { ReactNode } from "react";

interface TabHeaderProps {
  icon: string;
  title: string;
  description?: string;
  iconColor?: string;
  badgeText?: string;
  badgeClassName?: string;
  actions?: ReactNode;
  className?: string;
}

/**
 * Единая шапка для всех табов дашборда.
 * Слева — иконка в цветной плашке, заголовок и описание.
 * Справа — слот для действий (кнопки, поиск и т.д.).
 */
export default function TabHeader({
  icon,
  title,
  description,
  iconColor = "neon-purple",
  badgeText,
  badgeClassName,
  actions,
  className = "",
}: TabHeaderProps) {
  return (
    <div className={`flex items-center justify-between gap-3 mb-4 flex-wrap ${className}`}>
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
          className={`w-11 h-11 rounded-xl bg-${iconColor}/15 border border-${iconColor}/25 flex items-center justify-center shrink-0`}
        >
          <Icon name={icon as never} size={20} className={`text-${iconColor}`} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-oswald font-bold text-2xl text-white uppercase leading-none">{title}</h2>
            {badgeText && (
              <Badge className={badgeClassName || "bg-white/10 text-white border-white/15 text-[10px] py-0 px-2"}>
                {badgeText}
              </Badge>
            )}
          </div>
          {description && (
            <p className="text-white/45 text-xs mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}