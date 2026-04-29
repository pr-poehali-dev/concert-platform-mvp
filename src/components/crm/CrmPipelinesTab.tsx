import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { CRM_URL } from "./crmTypes";

interface Pipeline {
  id: string;
  title: string;
  description: string;
}

interface Props {
  userId: string;
}

export default function CrmPipelinesTab({ userId }: Props) {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${CRM_URL}?action=crm_pipelines_list&user_id=${userId}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => setPipelines(d.pipelines || []))
      .catch(() => setPipelines([]))
      .finally(() => setLoading(false));
  }, [userId]);

  const create = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    await fetch(`${CRM_URL}?action=crm_pipeline_create`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, title: form.title.trim(), description: form.description }),
    });
    setSaving(false); setShowForm(false);
    setForm({ title: "", description: "" });
    fetch(`${CRM_URL}?action=crm_pipelines_list&user_id=${userId}`).then(r => r.json()).then(d => setPipelines(d.pipelines || []));
  };

  if (loading) return <Icon name="Loader2" size={20} className="animate-spin text-neon-purple mx-auto" />;

  return (
    <div className="space-y-4 text-left max-w-2xl mx-auto">
      <button onClick={() => setShowForm(v => !v)}
        className="flex items-center gap-2 px-4 py-2 bg-neon-purple/20 border border-neon-purple/30 text-neon-purple rounded-xl text-sm font-medium hover:bg-neon-purple/30 transition-all mx-auto">
        <Icon name="Plus" size={14} />Новая воронка
      </button>
      {showForm && (
        <div className="glass-strong rounded-2xl p-4 border border-neon-purple/30">
          <div className="space-y-3">
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Название воронки"
              className="w-full glass rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 outline-none border border-white/10 text-sm" />
            <div className="flex gap-3">
              <button onClick={create} disabled={saving || !form.title.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50">
                {saving ? <Icon name="Loader2" size={14} className="animate-spin" /> : "Создать"}
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 glass rounded-xl text-white/40 text-sm border border-white/10">Отмена</button>
            </div>
          </div>
        </div>
      )}
      {pipelines.map(p => (
        <div key={p.id} className="glass rounded-2xl p-4 border border-white/10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-neon-purple/20 flex items-center justify-center">
            <Icon name="GitMerge" size={14} className="text-neon-purple" />
          </div>
          <div>
            <p className="text-white font-medium text-sm">{p.title}</p>
            {p.description && <p className="text-white/40 text-xs">{p.description}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}