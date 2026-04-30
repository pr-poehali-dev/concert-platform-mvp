import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import { SIGN_URL, SESSION_KEY } from "./docTypes";

export interface UserSuggestion {
  id: string;
  name: string;
  displayName: string;
  email: string;
  role: string;
  roleLabel: string;
  logoUrl: string;
}

interface Props {
  label: string;
  placeholder?: string;
  email: string;
  name: string;
  onEmailChange: (v: string) => void;
  onNameChange: (v: string) => void;
}

export default function UserSearch({ label, placeholder, email, name, onEmailChange, onNameChange }: Props) {
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const search = async (q: string) => {
    if (q.length < 2) { setSuggestions([]); setOpen(false); return; }
    setSearching(true);
    try {
      const r = await fetch(`${SIGN_URL}?action=search_users&q=${encodeURIComponent(q)}`, {
        headers: { "X-Session-Id": localStorage.getItem(SESSION_KEY) || "" },
      });
      const d = await r.json();
      setSuggestions(d.users || []);
      setOpen((d.users || []).length > 0);
    } catch { /* silent */ }
    finally { setSearching(false); }
  };

  const handleInput = (val: string) => {
    onEmailChange(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(val), 300);
  };

  const pick = (u: UserSuggestion) => {
    onEmailChange(u.email);
    onNameChange(u.displayName || u.name);
    setSuggestions([]);
    setOpen(false);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="space-y-3">
      <div ref={wrapRef} className="relative">
        <label className="text-xs text-white/65 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <Icon name="Mail" size={10} />{label}
        </label>
        <div className="relative">
          <input
            type="text"
            value={email}
            onChange={e => handleInput(e.target.value)}
            onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
            placeholder={placeholder || "email или имя контрагента"}
            className="gl-input pr-8"
            autoComplete="off"
          />
          {searching && (
            <Icon name="Loader2" size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/55 animate-spin" />
          )}
        </div>
        {open && suggestions.length > 0 && (
          <div className="absolute z-50 top-full mt-1 left-0 right-0 rounded-xl border border-white/10 shadow-2xl overflow-hidden" style={{ background: "#1a1a30" }}>
            {suggestions.map(u => (
              <button
                key={u.id}
                type="button"
                onMouseDown={() => pick(u)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-neon-purple/10 border border-neon-purple/20 flex items-center justify-center shrink-0 text-xs font-bold text-neon-purple">
                  {u.logoUrl
                    ? <img src={u.logoUrl} alt="" className="w-full h-full object-cover rounded-lg" />
                    : (u.displayName || u.name).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{u.displayName || u.name}</p>
                  <p className="text-white/60 text-xs truncate">{u.email}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${
                  u.role === "venue"
                    ? "text-neon-cyan border-neon-cyan/20 bg-neon-cyan/5"
                    : "text-neon-purple border-neon-purple/20 bg-neon-purple/5"
                }`}>
                  {u.roleLabel}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div>
        <label className="text-xs text-white/65 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <Icon name="User" size={10} />Имя получателя (необязательно)
        </label>
        <input
          type="text"
          value={name}
          onChange={e => onNameChange(e.target.value)}
          placeholder="Иван Иванов"
          className="gl-input"
        />
      </div>
    </div>
  );
}