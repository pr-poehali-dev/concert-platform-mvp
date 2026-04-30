import Icon from "@/components/ui/icon";
import { type MailListItem, type MailFull } from "./mailTypes";
import MailListItemRow from "./MailListItem";

const PAGE_SIZE = 40;

interface Props {
  messages: MailListItem[];
  openMail: MailFull | null;
  loadingList: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  totalCount: number;
  searchQuery: string;
  searchInput: string;
  filterUnread: boolean;
  filterAttach: boolean;
  selectedUids: Set<string>;
  bulkLoading: boolean;
  dragUids: string[];
  activeFolder: string;
  onScrollLoad: () => void;
  onLoadMore: () => void;
  onSearchInput: (v: string) => void;
  onClearSearch: () => void;
  onToggleFilterUnread: () => void;
  onToggleFilterAttach: () => void;
  onSelectAllVisible: () => void;
  onBulkMarkRead: (isRead: boolean) => void;
  onBulkMove: (target: string) => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
  onOpenMessage: (uid: string) => void;
  onToggleSelect: (uid: string) => void;
  onSwipeDelete: (uid: string) => void;
  onSwipeArchive: (uid: string) => void;
  onDragStart: (e: React.DragEvent, uid: string, subject: string) => void;
  onDragEnd: () => void;
}

export default function MailMessageList({
  messages, openMail, loadingList, loadingMore, hasMore, totalCount,
  searchQuery, searchInput, filterUnread, filterAttach,
  selectedUids, bulkLoading, dragUids, activeFolder,
  onScrollLoad, onLoadMore, onSearchInput, onClearSearch,
  onToggleFilterUnread, onToggleFilterAttach, onSelectAllVisible,
  onBulkMarkRead, onBulkMove, onBulkDelete, onClearSelection,
  onOpenMessage, onToggleSelect, onSwipeDelete, onSwipeArchive,
  onDragStart, onDragEnd,
}: Props) {
  return (
    <section
      className="col-span-12 sm:col-span-9 lg:col-span-4 glass rounded-xl border border-white/10 overflow-y-auto scrollbar-thin flex flex-col"
      onScroll={(e) => {
        const el = e.currentTarget;
        if (hasMore && !loadingMore && (el.scrollHeight - el.scrollTop - el.clientHeight < 200)) {
          onScrollLoad();
        }
      }}
    >
      {/* Поиск + фильтры + массовые действия */}
      <div className="sticky top-0 bg-[var(--glass-strong-bg,#13131f)]/85 backdrop-blur-md border-b border-white/8 px-2 py-2 z-10 space-y-2">
        {selectedUids.size > 0 ? (
          /* Панель массовых действий */
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white/85 text-xs font-bold px-1">
              Выбрано: {selectedUids.size}
            </span>
            <button
              onClick={() => onBulkMarkRead(true)}
              disabled={bulkLoading}
              title="Прочитано"
              className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-white/75 hover:text-white text-[11px] flex items-center gap-1 disabled:opacity-50"
            >
              <Icon name="MailCheck" size={12} /> Прочит.
            </button>
            <button
              onClick={() => onBulkMarkRead(false)}
              disabled={bulkLoading}
              title="Непрочитано"
              className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-white/75 hover:text-white text-[11px] flex items-center gap-1 disabled:opacity-50"
            >
              <Icon name="Mail" size={12} /> Непрочит.
            </button>
            {activeFolder.toUpperCase() !== "TRASH" && (
              <button
                onClick={() => onBulkMove("Trash")}
                disabled={bulkLoading}
                title="В корзину"
                className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-white/75 hover:text-white text-[11px] flex items-center gap-1 disabled:opacity-50"
              >
                <Icon name="Archive" size={12} /> В корзину
              </button>
            )}
            <button
              onClick={onBulkDelete}
              disabled={bulkLoading}
              className="px-2 py-1 bg-neon-pink/15 hover:bg-neon-pink/25 rounded text-neon-pink text-[11px] flex items-center gap-1 disabled:opacity-50"
            >
              <Icon name="Trash2" size={12} /> Удалить
            </button>
            <button
              onClick={onClearSelection}
              className="ml-auto text-white/55 hover:text-white text-[11px]"
            >
              Отмена
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 px-2 py-1.5 bg-white/5 rounded-lg border border-white/10">
              <Icon name="Search" size={14} className="text-white/45 shrink-0" />
              <input
                type="text"
                value={searchInput}
                onChange={e => onSearchInput(e.target.value)}
                placeholder={`Поиск ${searchQuery ? "..." : "по теме, отправителю, тексту"}`}
                className="flex-1 bg-transparent text-white text-xs outline-none placeholder:text-white/30 min-w-0"
              />
              {searchInput && (
                <button onClick={onClearSearch} className="text-white/45 hover:text-white shrink-0">
                  <Icon name="X" size={12} />
                </button>
              )}
            </div>
            {/* Фильтры-чипы */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={onToggleFilterUnread}
                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-all ${
                  filterUnread
                    ? "bg-neon-purple/20 text-neon-purple border-neon-purple/40"
                    : "bg-white/5 text-white/55 border-white/10 hover:text-white"
                }`}
              >
                <Icon name="Mail" size={10} className="inline mr-1" />
                Непрочитанные
              </button>
              <button
                onClick={onToggleFilterAttach}
                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-all ${
                  filterAttach
                    ? "bg-neon-cyan/20 text-neon-cyan border-neon-cyan/40"
                    : "bg-white/5 text-white/55 border-white/10 hover:text-white"
                }`}
              >
                <Icon name="Paperclip" size={10} className="inline mr-1" />
                С вложениями
              </button>
              {messages.length > 0 && (
                <button
                  onClick={onSelectAllVisible}
                  className="ml-auto text-white/55 hover:text-white text-[11px] flex items-center gap-1"
                >
                  <Icon name="CheckSquare" size={11} /> Выбрать все
                </button>
              )}
            </div>
            {(searchQuery || filterUnread || filterAttach) && (
              <p className="text-white/40 text-[10px] px-1">
                Найдено: {totalCount} {totalCount === 1 ? "письмо" : totalCount < 5 ? "письма" : "писем"}
              </p>
            )}
          </>
        )}
      </div>

      {loadingList ? (
        <div className="flex justify-center py-10">
          <Icon name="Loader2" size={20} className="text-white/40 animate-spin" />
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center py-16 text-white/40 text-sm">
          <Icon name="MailX" size={28} className="mx-auto mb-2 text-white/25" />
          {searchQuery ? "Ничего не найдено" : "Нет писем"}
        </div>
      ) : (
        <div className="divide-y divide-white/5">
          {messages.map(m => (
            <MailListItemRow
              key={m.uid}
              m={m}
              checked={selectedUids.has(m.uid)}
              isDragging={dragUids.includes(m.uid) && dragUids.length > 0}
              isOpen={openMail?.uid === m.uid}
              hasSelection={selectedUids.size > 0}
              onOpen={() => onOpenMessage(m.uid)}
              onToggleSelect={() => onToggleSelect(m.uid)}
              onDelete={() => onSwipeDelete(m.uid)}
              onArchive={() => onSwipeArchive(m.uid)}
              onDragStart={(e) => onDragStart(e, m.uid, m.subject)}
              onDragEnd={onDragEnd}
            />
          ))}
          {/* Подгрузка следующей страницы */}
          {hasMore && (
            <div className="px-3 py-3 text-center">
              <button
                onClick={onLoadMore}
                disabled={loadingMore}
                className="text-neon-purple hover:text-white text-xs font-semibold flex items-center gap-1.5 mx-auto disabled:opacity-50"
              >
                {loadingMore ? (
                  <><Icon name="Loader2" size={12} className="animate-spin" /> Загрузка...</>
                ) : (
                  <><Icon name="ChevronDown" size={12} /> Показать ещё</>
                )}
              </button>
            </div>
          )}
          {!hasMore && messages.length >= PAGE_SIZE && (
            <p className="text-center text-white/30 text-[10px] py-3">Это все письма ({totalCount})</p>
          )}
        </div>
      )}
    </section>
  );
}
