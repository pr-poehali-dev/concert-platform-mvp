import { useState, useEffect, useRef } from "react";

export const IMG_MEETING = "https://cdn.poehali.dev/projects/1ed8ea58-594e-40fe-8962-42d12ff34e0f/files/b5ad0ca1-b75d-4082-a2dc-04e63ada26ba.jpg";
export const IMG_CHARTS  = "https://cdn.poehali.dev/projects/1ed8ea58-594e-40fe-8962-42d12ff34e0f/files/5dcf06cd-b2c9-4d3f-89a4-a28979fcdd16.jpg";
export const IMG_CONCERT = "https://cdn.poehali.dev/projects/1ed8ea58-594e-40fe-8962-42d12ff34e0f/files/21438349-6bd4-484b-9851-c8f89c135c51.jpg";
export const IMG_HERO    = "https://cdn.poehali.dev/projects/1ed8ea58-594e-40fe-8962-42d12ff34e0f/files/c969ae71-7a9a-4f65-b744-3969d9375dbb.jpg";
export const IMG_VENUE   = "https://cdn.poehali.dev/projects/1ed8ea58-594e-40fe-8962-42d12ff34e0f/files/1c73dd10-0cee-421e-ae63-02ea7734eacc.jpg";

export const SLIDES = [
  { id: "cover" },
  { id: "market" },
  { id: "problem" },
  { id: "solution" },
  { id: "product" },
  { id: "traction" },
  { id: "business-model" },
  { id: "competition" },
  { id: "growth" },
  { id: "team" },
  { id: "financials" },
  { id: "ask" },
];

export const SLIDE_LABELS = ["Обложка","Рынок","Проблема","Решение","Продукт","Тракшн","Бизнес-модель","Конкуренты","Рост","Команда","Финансы","Запрос"];

export function Counter({ to, suffix = "", prefix = "" }: { to: number; suffix?: string; prefix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      let start = 0;
      const step = Math.ceil(to / 80);
      intervalId = setInterval(() => {
        start += step;
        if (start >= to) {
          setVal(to);
          if (intervalId) clearInterval(intervalId);
        } else {
          setVal(start);
        }
      }, 16);
    });
    if (ref.current) obs.observe(ref.current);
    return () => {
      obs.disconnect();
      if (intervalId) clearInterval(intervalId);
    };
  }, [to]);
  return <span ref={ref}>{prefix}{val.toLocaleString("ru")}{suffix}</span>;
}

export default Counter;
