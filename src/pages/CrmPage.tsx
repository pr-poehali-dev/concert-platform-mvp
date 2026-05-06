import { useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useData } from "./crm/CrmCore";
import { Dashboard, Companies, Tasks, Goals, type Tab } from "./crm/CrmViews";
import { Deals } from "./crm/CrmDeals";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id:"dashboard", label:"Главная", icon:"🏠" },
  { id:"deals",     label:"Сделки",  icon:"💼" },
  { id:"companies", label:"Компании",icon:"🏢" },
  { id:"tasks",     label:"Задачи",  icon:"✅" },
  { id:"goals",     label:"Цели",    icon:"🎯" },
];

export default function CrmPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("dashboard");
  const userId = user?.id || "";
  const data = useData(userId);
  const go = useCallback((t: Tab) => { setTab(t); window.scrollTo({ top:0, behavior:"smooth" }); }, []);

  if (!user) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: "#8b949e" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔐</div>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Войдите в аккаунт</div>
        <div style={{ fontSize: 13 }}>CRM доступна только авторизованным пользователям</div>
      </div>
    );
  }

  if (data.loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
        <div style={{ width: 36, height: 36, border: "3px solid #21262d", borderTopColor: "#a855f7", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div className="crm-shell" style={{ background:"#0d1117", minHeight:"100vh", color:"#f0f6fc", fontFamily:"inherit" }}>
      <style>{`
        .crm-shell { padding-right: 96px; }
        .crm-side-nav { width: 80px; }
        @media (max-width: 640px) {
          .crm-shell { padding-right: 76px; }
          .crm-side-nav { width: 64px; }
          .crm-side-nav button { width: 56px !important; font-size: 10px !important; padding: 8px 2px !important; }
          .crm-side-nav button span { font-size: 20px !important; }
        }
      `}</style>
      {tab==="dashboard" && <Dashboard deals={data.deals} tasks={data.tasks} goals={data.goals} companies={data.companies} onTab={go} />}
      {tab==="deals"     && <Deals deals={data.deals} companies={data.companies} saveDeal={data.saveDeal} deleteDeal={data.deleteDeal} />}
      {tab==="companies" && <Companies companies={data.companies} saveCompany={data.saveCompany} deleteCompany={data.deleteCompany} />}
      {tab==="tasks"     && <Tasks tasks={data.tasks} saveTask={data.saveTask} deleteTask={data.deleteTask} />}
      {tab==="goals"     && <Goals goals={data.goals} saveGoal={data.saveGoal} deleteGoal={data.deleteGoal} />}

      <nav
        className="crm-side-nav"
        style={{
          position:"fixed", top:"50%", right:12, transform:"translateY(-50%)",
          background:"rgba(22,27,34,0.85)", backdropFilter:"blur(12px)",
          border:"1px solid #30363d", borderRadius:20,
          display:"flex", flexDirection:"column", gap:6, padding:8,
          boxShadow:"0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(168,85,247,0.1)",
          zIndex:100,
        }}
      >
        {TABS.map(t=>{
          const active = tab===t.id;
          return (
            <button
              key={t.id}
              onClick={()=>go(t.id)}
              title={t.label}
              style={{
                width:64, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                padding:"10px 4px", gap:4, borderRadius:14,
                background: active ? "linear-gradient(135deg,#a855f7 0%,#6366f1 100%)" : "transparent",
                border:"none", cursor:"pointer",
                color: active ? "#fff" : "#c9d1d9",
                fontSize:11, fontWeight: active ? 700 : 600, fontFamily:"inherit",
                letterSpacing:0.2,
                boxShadow: active ? "0 8px 20px rgba(168,85,247,0.45)" : "none",
                transform: active ? "scale(1.05)" : "scale(1)",
                transition:"all .25s ease",
              }}
              onMouseEnter={e=>{ if(!active){ e.currentTarget.style.background="rgba(168,85,247,0.12)"; e.currentTarget.style.color="#fff"; } }}
              onMouseLeave={e=>{ if(!active){ e.currentTarget.style.background="transparent"; e.currentTarget.style.color="#c9d1d9"; } }}
            >
              <span style={{ fontSize:24, lineHeight:1, filter: active ? "drop-shadow(0 2px 4px rgba(0,0,0,0.4))" : "none" }}>{t.icon}</span>
              {t.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
