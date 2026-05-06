import { useState } from "react";
import { type Company, type Deal, STAGES, css, fmt, KPI, Bar, Bdg, Modal, Field, Empty } from "./CrmCore";

export function Deals({ deals, companies, saveDeal, deleteDeal }: { deals: Deal[]; companies: Company[]; saveDeal: (d: Partial<Deal>) => Promise<void>; deleteDeal: (id: string) => Promise<void> }) {
  const [view, setView] = useState<"kanban"|"list">("kanban");
  const [modal, setModal] = useState<Deal | null | "new">(null);
  const [form, setForm] = useState<Partial<Deal>>({});
  const [drag, setDrag] = useState<string|null>(null);

  const open = (d: Deal | "new") => { setForm(d === "new" ? { stage:"lead", probability:30, amount:0 } : {...d}); setModal(d); };
  const close = () => setModal(null);
  const save = async () => {
    if (!form.title) return;
    const co = companies.find(c => c.id === form.companyId);
    await saveDeal({ ...form, companyName: co?.name || form.companyName || "" });
    close();
  };
  const del = async (id: string) => { await deleteDeal(id); close(); };

  const revenue = deals.filter(d=>d.stage==="won").reduce((s,d)=>s+d.amount,0);
  const pipeline = deals.filter(d=>!["won","lost"].includes(d.stage)).reduce((s,d)=>s+d.amount*d.probability/100,0);

  return (
    <div style={{ padding:16, maxWidth:1100, margin:"0 auto" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div style={{ fontSize:28, fontWeight:800, color:"#fff", letterSpacing:-0.5 }}>Воронка продаж</div>
        <button style={{ ...css.btn, background:"linear-gradient(135deg,#a855f7 0%,#6366f1 100%)", color:"#fff", padding:"12px 22px", fontSize:15 }} onClick={() => open("new")}>+ Сделка</button>
      </div>
      <div style={{ ...css.g4, marginBottom:16 }}>
        <KPI label="Pipeline" value={fmt.money(pipeline)} accent="#a855f7" />
        <KPI label="Выиграно" value={fmt.money(revenue)} accent="#4ade80" />
        <KPI label="Всего" value={String(deals.length)} accent="#22d3ee" />
        <KPI label="Конверсия" value={`${deals.length?Math.round(deals.filter(d=>d.stage==="won").length/deals.length*100):0}%`} accent="#f59e0b" />
      </div>

      <div style={{ display:"flex", gap:4, background:"#1c2333", borderRadius:6, padding:4, marginBottom:16, width:"fit-content" }}>
        {(["kanban","list"] as const).map(v => <button key={v} onClick={()=>setView(v)} style={{ ...css.btn, background:view===v?"#a855f7":"none", color:view===v?"#fff":"#8b949e", padding:"6px 16px", fontSize:13 }}>{v==="kanban"?"Канбан":"Список"}</button>)}
      </div>

      {deals.length === 0 && (
        <Empty icon="💼" title="Нет сделок" hint="Добавьте первую сделку — укажите клиента, сумму и этап переговоров" action="Создать сделку" onAction={() => open("new")} />
      )}

      {deals.length > 0 && view === "kanban" ? (
        <div style={{ display:"flex", gap:12, overflowX:"auto", paddingBottom:16 }}>
          {STAGES.map(st => (
            <div key={st.id} style={{ minWidth:240, flexShrink:0, background:"#1c2333", borderRadius:10, border:"1px solid #21262d" }}
              onDragOver={e=>e.preventDefault()}
              onDrop={async ()=>{
                if(drag){
                  const d=deals.find(x=>x.id===drag);
                  if(d && d.stage !== st.id){
                    try { await saveDeal({...d, stage: st.id}); } catch { /* silent */ }
                  }
                }
                setDrag(null);
              }}>
              <div style={{ padding:"12px 14px", borderBottom:"1px solid #21262d", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}><div style={{ width:8,height:8,borderRadius:"50%",background:st.color }}/><span style={{ fontSize:13,fontWeight:600 }}>{st.label}</span></div>
                <span style={{ fontSize:11,color:"#8b949e",background:"#21262d",padding:"2px 8px",borderRadius:20 }}>{deals.filter(d=>d.stage===st.id).length}</span>
              </div>
              <div style={{ padding:8, display:"flex", flexDirection:"column", gap:8, minHeight:60 }}>
                {deals.filter(d=>d.stage===st.id).map(d=>(
                  <div key={d.id} draggable onDragStart={()=>setDrag(d.id)} onClick={()=>open(d)}
                    style={{ background:"#161b22", border:"1px solid #21262d", borderRadius:6, padding:12, cursor:"pointer", borderLeft:`3px solid ${st.color}` }}>
                    <div style={{ fontSize:13,fontWeight:500,marginBottom:4 }}>{d.title}</div>
                    <div style={{ fontSize:11,color:"#8b949e",marginBottom:6 }}>{d.companyName}</div>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4 }}>
                      <span style={{ fontSize:13,fontWeight:600,color:"#a855f7" }}>{fmt.money(d.amount)}</span>
                      <span style={{ fontSize:11,color:"#8b949e" }}>{d.probability}%</span>
                    </div>
                    <Bar pct={d.probability} h={4} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={css.card}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead><tr>{["Сделка","Сумма","Этап","Вер-ть","Менеджер"].map(h=><th key={h} style={{ padding:"10px 12px",textAlign:"left",fontSize:11,color:"#8b949e",fontWeight:600,borderBottom:"1px solid #21262d" }}>{h}</th>)}</tr></thead>
            <tbody>{deals.map(d=>{ const st=STAGES.find(s=>s.id===d.stage); return (
              <tr key={d.id} onClick={()=>open(d)} style={{ cursor:"pointer", borderBottom:"1px solid #21262d" }}>
                <td style={{ padding:"10px 12px" }}><div style={{ fontWeight:500 }}>{d.title}</div><div style={{ fontSize:11,color:"#8b949e" }}>{d.companyName}</div></td>
                <td style={{ padding:"10px 12px",color:"#a855f7",fontWeight:600 }}>{fmt.money(d.amount)}</td>
                <td style={{ padding:"10px 12px" }}><Bdg label={st?.label||""} color={st?.color||"#6b7280"} /></td>
                <td style={{ padding:"10px 12px" }}>{d.probability}%</td>
                <td style={{ padding:"10px 12px" }}>{d.assignee}</td>
              </tr>);
            })}</tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={modal==="new"?"Новая сделка":(modal as Deal).title} onClose={close}
          footer={<>{modal!=="new"&&<button style={{ ...css.btn,background:"#f43f5e22",color:"#f43f5e" }} onClick={()=>del((modal as Deal).id)}>Удалить</button>}<button style={{ ...css.btn,background:"#21262d",color:"#f0f6fc" }} onClick={close}>Отмена</button><button style={{ ...css.btn,background:"linear-gradient(135deg,#a855f7 0%,#6366f1 100%)",color:"#fff" }} onClick={save}>Сохранить</button></>}>
          <Field label="Название *"><input style={css.input} value={form.title||""} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Название сделки" /></Field>
          <Field label="Компания"><select style={css.input} value={form.companyId||""} onChange={e=>setForm(f=>({...f,companyId:e.target.value}))}><option value="">— Выберите —</option>{companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <div style={css.g2}>
            <Field label="Сумма ₽"><input style={css.input} type="number" value={form.amount||""} onChange={e=>setForm(f=>({...f,amount:+e.target.value}))} /></Field>
            <Field label="Вероятность %"><input style={css.input} type="number" value={form.probability||""} onChange={e=>setForm(f=>({...f,probability:+e.target.value}))} /></Field>
          </div>
          <Field label="Этап"><select style={css.input} value={form.stage||"lead"} onChange={e=>setForm(f=>({...f,stage:e.target.value}))}>{STAGES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select></Field>
          <Field label="Менеджер"><input style={css.input} value={form.assignee||""} onChange={e=>setForm(f=>({...f,assignee:e.target.value}))} /></Field>
          <Field label="Дедлайн"><input style={{ ...css.input, colorScheme:"dark" }} type="date" value={form.deadline?.split("T")[0]||""} onChange={e=>setForm(f=>({...f,deadline:e.target.value}))} /></Field>
        </Modal>
      )}
    </div>
  );
}