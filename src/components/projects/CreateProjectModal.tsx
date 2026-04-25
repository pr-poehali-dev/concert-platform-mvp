import { useState } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";
import { PROJECTS_URL } from "@/hooks/useProjects";
import { DEFAULT_EXPENSES, type VenueOption, type BookedDate, type ExpenseLine, type IncomeLine, type ProjectForm } from "./create/types";
import StepBasic from "./create/StepBasic";
import StepVenue from "./create/StepVenue";
import StepExpenses from "./create/StepExpenses";
import StepIncome from "./create/StepIncome";
import StepTax from "./create/StepTax";

interface Props { open: boolean; onClose: () => void; onCreated: (id: string) => void; }

export default function CreateProjectModal({ open, onClose, onCreated }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);

  const [form, setForm] = useState<ProjectForm>({
    title: "", artist: "", projectType: "single",
    status: "planning", dateStart: "", dateEnd: "", city: "Москва",
    venueName: "", description: "", taxSystem: "none",
    ticketingFeePercent: 0,
    eventTime: "", ageLimit: "", expectedGuests: 0,
  });

  // Площадки
  const [venues, setVenues] = useState<VenueOption[]>([]);
  const [venuesLoading, setVenuesLoading] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<VenueOption | null>(null);
  const [bookedDates, setBookedDates] = useState<BookedDate[]>([]);
  const [venueSearch, setVenueSearch] = useState("");

  const [expenses, setExpenses] = useState<ExpenseLine[]>(
    DEFAULT_EXPENSES.map((e, i) => ({ ...e, id: String(i), amountFact: 0, note: "" }))
  );
  const [incomeLines, setIncomeLines] = useState<IncomeLine[]>([
    { id: "0", category: "Партер", ticketCount: 0, ticketPrice: 0, soldCount: 0, note: "" },
    { id: "1", category: "VIP",    ticketCount: 0, ticketPrice: 0, soldCount: 0, note: "" },
  ]);

  if (!open) return null;

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const loadVenues = async (city: string) => {
    setVenuesLoading(true);
    try {
      const res = await fetch(`${PROJECTS_URL}?action=venues_list&city=${encodeURIComponent(city)}`);
      const data = await res.json();
      setVenues(data.venues || []);
    } catch { /* silent */ }
    finally { setVenuesLoading(false); }
  };

  const loadBookedDates = async (venueId: string) => {
    try {
      const res = await fetch(`${PROJECTS_URL}?action=booked_dates&venue_id=${venueId}`);
      const data = await res.json();
      setBookedDates(data.bookedDates || []);
    } catch { /* silent */ }
  };

  const selectVenue = (v: VenueOption) => {
    setSelectedVenue(v);
    set("venueName", v.name);
    loadBookedDates(v.id);
  };

  const clearVenue = () => {
    setSelectedVenue(null);
    set("venueName", "");
    setBookedDates([]);
  };

  const isDateBooked = (date: string) => bookedDates.some(b => b.date === date);
  const dateStartBooked = form.dateStart && isDateBooked(form.dateStart);

  // Expenses
  const setExp = (id: string, k: string, v: unknown) =>
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, [k]: v } : e));
  const addExp = () => setExpenses(prev => [...prev, { id: Date.now().toString(), category: "Прочее", title: "", amountPlan: 0, amountFact: 0, note: "" }]);
  const delExp = (id: string) => setExpenses(prev => prev.filter(e => e.id !== id));

  // Income
  const setInc = (id: string, k: string, v: unknown) =>
    setIncomeLines(prev => prev.map(i => i.id === id ? { ...i, [k]: v } : i));
  const addInc = () => setIncomeLines(prev => [...prev, { id: Date.now().toString(), category: "Стандарт", ticketCount: 0, ticketPrice: 0, soldCount: 0, note: "" }]);
  const delInc = (id: string) => setIncomeLines(prev => prev.filter(i => i.id !== id));

  const totalExpPlan = expenses.reduce((s, e) => s + Number(e.amountPlan), 0);
  const totalIncPlan = incomeLines.reduce((s, i) => s + Number(i.ticketCount) * Number(i.ticketPrice), 0);
  const profitPreview = totalIncPlan - totalExpPlan;

  const step1Valid = form.title.trim().length > 0;
  const canNext = step === 1 ? step1Valid : true;

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError("Введите название проекта"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${PROJECTS_URL}?action=create`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user!.id, ...form,
          expenses: [
            ...expenses.filter(e => e.title.trim()),
            ...(form.ticketingFeePercent > 0 ? [{
              category: "Билетный оператор",
              title: `Вознаграждение билетного оператора (${form.ticketingFeePercent}%)`,
              amountPlan: Math.round(totalIncPlan * form.ticketingFeePercent / 100),
              amountFact: 0,
              note: `${form.ticketingFeePercent}% от плановых продаж`,
            }] : []),
          ],
          incomeLines: incomeLines.filter(i => Number(i.ticketCount) > 0 || Number(i.ticketPrice) > 0),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const projectId = data.projectId;

      if (selectedVenue && form.dateStart && !dateStartBooked) {
        await fetch(`${PROJECTS_URL}?action=request_booking`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            venueId: selectedVenue.id,
            organizerId: user!.id,
            venueUserId: selectedVenue.userId,
            eventDate: form.dateStart,
            eventTime: form.eventTime,
            artist: form.artist,
            ageLimit: form.ageLimit,
            expectedGuests: form.expectedGuests,
          }),
        });
      }

      onCreated(projectId);
      onClose();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Ошибка"); }
    finally { setLoading(false); }
  };

  const STEPS = ["Основное", "Площадка", "Расходы", "Доходы", "Налоги"];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl glass-strong rounded-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scale-in">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-purple to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 shrink-0">
          <div>
            <h2 className="font-oswald font-bold text-2xl text-white">Новый проект</h2>
            <p className="text-white/40 text-sm">Шаг {step} из {STEPS.length}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors">
            <Icon name="X" size={16} />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 px-6 pb-4 shrink-0">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center gap-1.5 ${i + 1 <= step ? "text-neon-purple" : "text-white/25"}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${i + 1 < step ? "bg-neon-purple border-neon-purple text-white" : i + 1 === step ? "border-neon-purple text-neon-purple" : "border-white/20 text-white/25"}`}>
                  {i + 1 < step ? <Icon name="Check" size={12} /> : i + 1}
                </div>
                <span className="text-xs hidden sm:block">{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-px ${i + 1 < step ? "bg-neon-purple/60" : "bg-white/10"}`} />}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 pb-2 space-y-4">
          {step === 1 && (
            <StepBasic
              form={form}
              titleTouched={titleTouched}
              onSet={set}
              onTitleTouched={() => setTitleTouched(true)}
            />
          )}
          {step === 2 && (
            <StepVenue
              city={form.city}
              dateStart={form.dateStart}
              venues={venues}
              venuesLoading={venuesLoading}
              selectedVenue={selectedVenue}
              bookedDates={bookedDates}
              venueSearch={venueSearch}
              dateStartBooked={dateStartBooked}
              onSearchChange={setVenueSearch}
              onSelectVenue={selectVenue}
              onClearVenue={clearVenue}
            />
          )}
          {step === 3 && (
            <StepExpenses
              expenses={expenses}
              totalExpPlan={totalExpPlan}
              onSet={setExp}
              onAdd={addExp}
              onDel={delExp}
            />
          )}
          {step === 4 && (
            <StepIncome
              incomeLines={incomeLines}
              totalIncPlan={totalIncPlan}
              totalExpPlan={totalExpPlan}
              profitPreview={profitPreview}
              onSet={setInc}
              onAdd={addInc}
              onDel={delInc}
            />
          )}
          {step === 5 && (
            <StepTax
              taxSystem={form.taxSystem}
              ticketingFeePercent={form.ticketingFeePercent}
              totalIncPlan={totalIncPlan}
              totalExpPlan={totalExpPlan}
              onSet={set}
            />
          )}

          {error && (
            <div className="flex items-center gap-2 text-neon-pink text-sm bg-neon-pink/10 rounded-xl px-4 py-3 border border-neon-pink/20">
              <Icon name="AlertCircle" size={14} />{error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 shrink-0">
          <button onClick={() => step > 1 ? setStep(s => s - 1) : onClose()} className="flex items-center gap-2 px-4 py-2 glass rounded-xl text-white/60 hover:text-white text-sm transition-colors">
            <Icon name="ChevronLeft" size={16} />{step === 1 ? "Отмена" : "Назад"}
          </button>
          {step < STEPS.length ? (
            <button onClick={() => {
              if (!canNext) { setTitleTouched(true); return; }
              setError("");
              if (step === 1) loadVenues(form.city);
              setStep(s => s + 1);
            }}
              disabled={!canNext}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-sm transition-opacity">
              {step === 2 && !selectedVenue ? "Пропустить" : "Далее"}<Icon name="ChevronRight" size={16} />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading || !step1Valid || !!dateStartBooked}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-oswald font-semibold rounded-xl hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-sm transition-opacity">
              {loading ? <><Icon name="Loader2" size={16} className="animate-spin" />Создаём...</> : <><Icon name="Check" size={16} />Создать проект</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
