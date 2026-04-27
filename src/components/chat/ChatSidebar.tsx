import Icon from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { type Conversation, getAvatarColor, getInitial, formatTime } from "./chatTypes";

interface Props {
  conversations: Conversation[];
  activeConvId: string | null;
  loadingConvs: boolean;
  search: string;
  userRole?: string;
  onSearchChange: (value: string) => void;
  onSelectConv: (id: string) => void;
}

export default function ChatSidebar({
  conversations,
  activeConvId,
  loadingConvs,
  search,
  userRole,
  onSearchChange,
  onSelectConv,
}: Props) {
  const totalUnread = conversations.reduce((s, c) => s + (c.unread || 0), 0);

  const filtered = conversations.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    const company = (c.sidebarName || c.venueName || "").toLowerCase();
    const person  = (c.isOrganizer ? c.venueName : c.organizerName || "").toLowerCase();
    return company.includes(q) || person.includes(q);
  });

  return (
    <aside className={`shrink-0 flex flex-col glass sm:rounded-2xl overflow-hidden w-full sm:w-72 ${activeConvId ? "hidden sm:flex" : "flex"}`}>
      <div className="p-4 border-b border-white/10 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-oswald font-bold text-xl text-white">Сообщения</h2>
          {totalUnread > 0 && <Badge className="bg-neon-purple text-white text-xs">{totalUnread}</Badge>}
        </div>
        <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2">
          <Icon name="Search" size={14} className="text-white/30 shrink-0" />
          <input
            type="text"
            placeholder="Поиск диалогов..."
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            className="flex-1 bg-transparent text-white placeholder:text-white/30 outline-none text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {loadingConvs ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-3 items-center">
                <div className="w-10 h-10 rounded-full bg-white/5 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-white/5 rounded animate-pulse w-2/3" />
                  <div className="h-3 bg-white/5 rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-10 gap-3 px-4 text-center">
            <Icon name="MessageCircleOff" size={32} className="text-white/20" />
            <p className="text-white/30 text-sm">Нет диалогов</p>
            {userRole === "organizer" && (
              <p className="text-white/20 text-xs">Нажмите «Написать» на карточке площадки</p>
            )}
          </div>
        ) : (
          filtered.map(conv => {
            // Название чата = компания контрагента
            const companyName = conv.sidebarName
              || (conv.isOrganizer ? conv.venueName : conv.organizerCompany || conv.organizerName || "Организатор");
            // Подзаголовок = имя человека (площадка или организатор)
            const personName = conv.isOrganizer
              ? (conv.venueCompany && conv.venueCompany !== companyName ? conv.venueName : "")
              : (conv.organizerName || "");

            const color   = getAvatarColor(companyName);
            const initial = getInitial(companyName);
            const isActive = conv.id === activeConvId;

            return (
              <div
                key={conv.id}
                onClick={() => onSelectConv(conv.id)}
                className={`flex items-center gap-3 p-4 cursor-pointer transition-all hover:bg-white/5 border-b border-white/5 ${isActive ? "bg-neon-purple/10 border-l-2 border-l-neon-purple" : ""}`}
              >
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${color} flex items-center justify-center font-oswald font-bold text-white text-sm shrink-0`}>
                  {initial}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-semibold text-white text-sm truncate">{companyName}</span>
                    <span className="text-white/30 text-xs shrink-0 ml-2">{formatTime(conv.lastMessageAt)}</span>
                  </div>
                  {personName && (
                    <p className="text-white/35 text-xs truncate mb-0.5">{personName}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-white/40 text-xs truncate">{conv.lastMessage}</span>
                    {conv.unread > 0 && (
                      <Badge className="bg-neon-purple text-white text-xs px-1.5 py-0 h-4 min-w-4 ml-2 shrink-0">
                        {conv.unread}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
