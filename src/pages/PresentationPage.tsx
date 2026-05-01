import { useState, useEffect } from "react";
import SEOHead, { SEO_PAGES } from "@/components/SEOHead";
import { SLIDES } from "./presentation/presentationData";
import PresentationNav from "./presentation/PresentationNav";
import PresentationSlides1 from "./presentation/PresentationSlides1";
import PresentationSlides2 from "./presentation/PresentationSlides2";

export default function PresentationPage() {
  const [current, setCurrent] = useState(0);
  const total = SLIDES.length;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        setCurrent(c => Math.min(c + 1, total - 1));
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setCurrent(c => Math.max(c - 1, 0));
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [total]);

  const goTo = (i: number) => {
    document.getElementById(`slide-${i}`)?.scrollIntoView({ behavior: "smooth" });
    setCurrent(i);
  };

  useEffect(() => {
    document.getElementById(`slide-${current}`)?.scrollIntoView({ behavior: "smooth" });
  }, [current]);

  return (
    <>
      <SEOHead {...SEO_PAGES.presentation} />
      <div className="bg-background text-white font-golos">

        <PresentationNav current={current} total={total} goTo={goTo} />

        <PresentationSlides1 />
        <PresentationSlides2 />

      </div>
    </>
  );
}
