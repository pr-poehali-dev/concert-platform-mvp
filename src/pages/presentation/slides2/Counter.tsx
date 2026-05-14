import { useState, useEffect, useRef } from "react";

export default function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      let start = 0;
      const step = Math.ceil(to / 60);
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
  return <span ref={ref}>{val.toLocaleString("ru")}{suffix}</span>;
}
