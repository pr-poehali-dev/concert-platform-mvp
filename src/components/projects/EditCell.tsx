import { useState, useEffect } from "react";
import { fmt } from "@/hooks/useProjects";

interface Props {
  value: string | number;
  onSave: (v: string) => void;
  prefix?: string;
  suffix?: string;
  type?: string;
  className?: string;
}

export default function EditCell({ value, onSave, prefix="", suffix="", type="text", className="" }: Props) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(value));
  useEffect(()=>setVal(String(value)),[value]);
  if (!editing) return (
    <button onClick={()=>setEditing(true)} className={`text-left hover:opacity-70 transition-opacity ${className}`}>
      {prefix}{type==="number"&&value!==0?fmt(Number(value)):value}{suffix}
    </button>
  );
  return (
    <input autoFocus type={type} value={val}
      onChange={e=>setVal(e.target.value)}
      onBlur={()=>{onSave(val);setEditing(false);}}
      onKeyDown={e=>{if(e.key==="Enter"){onSave(val);setEditing(false);}if(e.key==="Escape"){setVal(String(value));setEditing(false);}}}
      className={`bg-white/10 rounded px-2 py-0.5 outline-none border border-neon-purple/50 text-sm ${className}`}
    />
  );
}
