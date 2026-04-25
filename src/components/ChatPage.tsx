import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationsContext";

const conversations = [
  {
    id: 1,
    name: "Volta",
    type: "Площадка",
    city: "Москва",
    avatar: "V",
    avatarColor: "from-neon-purple to-neon-pink",
    lastMessage: "Отлично, подтверждаем дату 15 сентября!",
    time: "10:32",
    unread: 2,
    online: true,
  },
  {
    id: 2,
    name: "Космонавт",
    type: "Площадка",
    city: "СПб",
    avatar: "К",
    avatarColor: "from-neon-cyan to-neon-green",
    lastMessage: "Пришлите технический райдер для согласования",
    time: "вчера",
    unread: 1,
    online: false,
  },
  {
    id: 3,
    name: "Иван Петров",
    type: "Организатор",
    city: "Москва",
    avatar: "И",
    avatarColor: "from-neon-green to-neon-cyan",
    lastMessage: "Можем обсудить условия по телефону?",
    time: "вчера",
    unread: 0,
    online: true,
  },
  {
    id: 4,
    name: "Teleclub",
    type: "Площадка",
    city: "Екб",
    avatar: "T",
    avatarColor: "from-neon-pink to-neon-purple",
    lastMessage: "Да, всё оборудование в наличии.",
    time: "Пн",
    unread: 0,
    online: false,
  },
];

const messages = [
  { id: 1, from: "them", text: "Добрый день! Получили ваш запрос на аренду площадки 15 сентября.", time: "10:00" },
  { id: 2, from: "me", text: "Здравствуйте! Да, нас интересует площадка на 1200 мест. Есть ли свободная дата?", time: "10:05" },
  { id: 3, from: "them", text: "Дата свободна. Какой у вас технический райдер? Нам нужно проверить соответствие нашего оборудования.", time: "10:12" },
  { id: 4, from: "me", text: "Отправлю райдер сегодня. Там стандартный комплект: PA Funktion One, световая матрица, 3 мониторные линии.", time: "10:18" },
  { id: 5, from: "them", text: "Всё есть в наличии. Стоимость аренды — 85 000 ₽ плюс технический персонал 15 000 ₽.", time: "10:25" },
  { id: 6, from: "me", text: "Принято. Когда можем подписать договор?", time: "10:29" },
  { id: 7, from: "them", text: "Отлично, подтверждаем дату 15 сентября! Договор пришлём завтра.", time: "10:32" },
];

export default function ChatPage() {
  const { user } = useAuth();
  const { sendNotification } = useNotifications();
  const [activeChat, setActiveChat] = useState(1);
  const [inputMessage, setInputMessage] = useState("");
  const [chatMessages, setChatMessages] = useState(messages);

  const active = conversations.find((c) => c.id === activeChat) || conversations[0];

  const handleSend = async () => {
    const text = inputMessage.trim();
    if (!text) return;
    const now = new Date();
    const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
    setChatMessages(prev => [...prev, { id: Date.now(), from: "me", text, time }]);
    setInputMessage("");
    // Уведомление собеседнику (demo: отправляем самому себе если нет реального user_id)
    if (user) {
      await sendNotification(
        user.id,
        "message",
        `Новое сообщение — ${active.name}`,
        text.slice(0, 80),
        "chat"
      );
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-5rem)]">
        <div className="flex gap-6 h-full">
          {/* Sidebar */}
          <aside className="w-80 shrink-0 flex flex-col glass rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h2 className="font-oswald font-bold text-xl text-white mb-3">Сообщения</h2>
              <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2">
                <Icon name="Search" size={16} className="text-white/30" />
                <input
                  type="text"
                  placeholder="Поиск..."
                  className="flex-1 bg-transparent text-white placeholder:text-white/30 outline-none text-sm"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => setActiveChat(conv.id)}
                  className={`flex items-center gap-3 p-4 cursor-pointer transition-colors hover:bg-white/5 border-b border-white/5 ${
                    activeChat === conv.id ? "bg-neon-purple/10 border-l-2 border-l-neon-purple" : ""
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${conv.avatarColor} flex items-center justify-center font-oswald font-bold text-white text-sm`}>
                      {conv.avatar}
                    </div>
                    {conv.online && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-neon-green rounded-full border-2 border-background" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-medium text-white text-sm truncate">{conv.name}</span>
                      <span className="text-white/30 text-xs shrink-0 ml-2">{conv.time}</span>
                    </div>
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
              ))}
            </div>
          </aside>

          {/* Chat window */}
          <div className="flex-1 flex flex-col glass rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-4 p-4 border-b border-white/10">
              <div className="relative">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${active.avatarColor} flex items-center justify-center font-oswald font-bold text-white text-sm`}>
                  {active.avatar}
                </div>
                {active.online && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-neon-green rounded-full border-2 border-background" />
                )}
              </div>
              <div>
                <h3 className="font-oswald font-semibold text-white">{active.name}</h3>
                <div className="flex items-center gap-2 text-xs text-white/40">
                  <Badge className="bg-white/10 text-white/50 border-white/10 text-xs py-0">{active.type}</Badge>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Icon name="MapPin" size={10} />
                    {active.city}
                  </span>
                  {active.online && (
                    <>
                      <span>·</span>
                      <span className="text-neon-green">онлайн</span>
                    </>
                  )}
                </div>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/50 hover:text-white">
                  <Icon name="FileText" size={16} />
                </button>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/50 hover:text-white">
                  <Icon name="MoreVertical" size={16} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
              <div className="text-center">
                <span className="text-xs text-white/20 bg-white/5 px-3 py-1 rounded-full">Сегодня</span>
              </div>

              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.from === "me" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-xs sm:max-w-md px-4 py-3 rounded-2xl text-sm ${
                      msg.from === "me"
                        ? "bg-gradient-to-br from-neon-purple/40 to-neon-cyan/20 text-white rounded-br-sm border border-neon-purple/30"
                        : "glass text-white/90 rounded-bl-sm"
                    }`}
                  >
                    <p className="leading-relaxed">{msg.text}</p>
                    <p className={`text-xs mt-1 ${msg.from === "me" ? "text-white/40 text-right" : "text-white/30"}`}>
                      {msg.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/10">
              <div className="flex items-end gap-3">
                <button className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-white/50 hover:text-white shrink-0">
                  <Icon name="Paperclip" size={16} />
                </button>

                <div className="flex-1 flex items-center glass-strong rounded-xl px-4 py-2.5">
                  <input
                    type="text"
                    placeholder="Написать сообщение..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                    className="flex-1 bg-transparent text-white placeholder:text-white/30 outline-none text-sm"
                  />
                </div>

                <button
                  onClick={handleSend}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl shrink-0 transition-all ${
                    inputMessage.trim()
                      ? "bg-gradient-to-br from-neon-purple to-neon-cyan text-white hover:opacity-90"
                      : "bg-white/5 text-white/30"
                  }`}
                >
                  <Icon name="Send" size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}