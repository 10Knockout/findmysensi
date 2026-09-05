"use client";

import { useEffect, useState } from "react";

type LoaderPhase = "visible" | "leaving" | "gone";

export function LandingMotion() {
  const [loaderPhase, setLoaderPhase] = useState<LoaderPhase>("visible");

  useEffect(() => {
    const root = document.documentElement;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const seenLoader = window.sessionStorage.getItem("fms-loader-seen") === "1";
    let leaveTimer: number | undefined;
    let removeTimer: number | undefined;

    root.classList.add("fms-motion");

    if (reduceMotion || seenLoader) {
      setLoaderPhase("gone");
    } else {
      window.sessionStorage.setItem("fms-loader-seen", "1");
      leaveTimer = window.setTimeout(() => setLoaderPhase("leaving"), 520);
      removeTimer = window.setTimeout(() => setLoaderPhase("gone"), 900);
    }

    const reveals = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]"),
    );
    if (reduceMotion || !("IntersectionObserver" in window)) {
      reveals.forEach((element) => element.classList.add("is-visible"));
      return () => {
        if (leaveTimer !== undefined) window.clearTimeout(leaveTimer);
        if (removeTimer !== undefined) window.clearTimeout(removeTimer);
        root.classList.remove("fms-motion");
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -10%", threshold: 0.08 },
    );
    reveals.forEach((element) => observer.observe(element));
    return () => {
      if (leaveTimer !== undefined) window.clearTimeout(leaveTimer);
      if (removeTimer !== undefined) window.clearTimeout(removeTimer);
      observer.disconnect();
      root.classList.remove("fms-motion");
    };
  }, []);

  if (loaderPhase === "gone") return null;

  return (
    <div className={`landing-loader ${loaderPhase}`} aria-hidden="true">
      <div className="landing-loader-mark">
        <span />
        <i />
      </div>
      <p>SYSTEM CALIBRATION // 128HZ</p>
      <div className="landing-loader-track">
        <i />
      </div>
    </div>
  );
}
