import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import CursorTrail from "./components/CursorTrail";
import DynamicBackground from "./components/DynamicBackground";
import Navbar from "./components/Navbar";

const LandingPage = lazy(() => import("./pages/LandingPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));

const THEME_STORAGE_KEY = "dashboard-theme";

function getInitialTheme() {
  if (typeof window === "undefined") {
    return "dark";
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "dark" || stored === "light") {
    return stored;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function detectLowPower() {
  if (typeof window === "undefined") {
    return false;
  }

  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = navigator.deviceMemory ?? 4;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return reducedMotion || cores <= 2 || memory <= 2;
}

function OnePageFlow({ lowPower, theme, onToggleTheme }) {
  const location = useLocation();

  const landingRef = useRef(null);
  const dashboardRef = useRef(null);
  const activeRef = useRef(location.pathname === "/dashboard" ? "dashboard" : "landing");
  const mountedRef = useRef(false);
  const progressRef = useRef(0);
  const [activeSection, setActiveSection] = useState(activeRef.current);
  const [scrollProgress, setScrollProgress] = useState(0);

  const updateActiveSection = useCallback((nextSection) => {
    if (activeRef.current === nextSection) {
      return;
    }

    activeRef.current = nextSection;
    setActiveSection(nextSection);
  }, []);

  const scrollToSection = useCallback(
    (section, behavior = "smooth") => {
      const targetRef = section === "dashboard" ? dashboardRef : landingRef;
      targetRef.current?.scrollIntoView({ behavior, block: "start" });
      updateActiveSection(section);
    },
    [updateActiveSection]
  );

  useEffect(() => {
    const nextSection = location.pathname === "/dashboard" ? "dashboard" : "landing";
    const behavior = mountedRef.current ? "smooth" : "auto";

    mountedRef.current = true;
    scrollToSection(nextSection, behavior);
  }, [location.pathname, scrollToSection]);

  useEffect(() => {
    function updateProgress() {
      const root = document.documentElement;
      const maxScroll = Math.max(root.scrollHeight - window.innerHeight, 1);
      const current = Math.min(Math.max((window.scrollY || window.pageYOffset) / maxScroll, 0), 1);
      const dashboardStart = dashboardRef.current?.offsetTop ?? Number.POSITIVE_INFINITY;
      const pivotY = (window.scrollY || window.pageYOffset) + 72 + window.innerHeight * 0.35;
      const nextSection = pivotY >= dashboardStart ? "dashboard" : "landing";

      if (Math.abs(current - progressRef.current) < 0.003) {
        updateActiveSection(nextSection);
      } else {
        progressRef.current = current;
        setScrollProgress(current);
        updateActiveSection(nextSection);
      }
    }

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);

    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, [updateActiveSection]);

  return (
    <div className={`app-shell theme ${lowPower ? "low-power" : ""}`}>
      <DynamicBackground lowPower={lowPower} />
      <CursorTrail lowPower={lowPower} />
      <Navbar
        theme={theme}
        onToggleTheme={onToggleTheme}
        activeSection={activeSection}
        scrollProgress={scrollProgress}
        onNavigateLanding={() => scrollToSection("landing")}
        onNavigateDashboard={() => scrollToSection("dashboard")}
      />

      <Suspense fallback={<div className="route-loading">Memuat halaman...</div>}>
        <div className="one-page-flow">
          <section
            id="landing-section"
            ref={landingRef}
            className={`flow-section ${activeSection === "landing" ? "is-active" : "is-inactive"}`}
          >
            <LandingPage
              lowPower={lowPower}
              fluid
              onEnterDashboard={() => scrollToSection("dashboard")}
            />
          </section>

          <section
            id="dashboard-section"
            ref={dashboardRef}
            className={`flow-section ${activeSection === "dashboard" ? "is-active" : "is-inactive"}`}
          >
            <DashboardPage lowPower={lowPower} fluid />
          </section>
        </div>
      </Suspense>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState(() => getInitialTheme());
  const [lowPower, setLowPower] = useState(() => detectLowPower());

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");

    function updatePerfMode() {
      setLowPower(detectLowPower());
    }

    if (media.addEventListener) {
      media.addEventListener("change", updatePerfMode);
      return () => media.removeEventListener("change", updatePerfMode);
    }

    media.addListener(updatePerfMode);
    return () => media.removeListener(updatePerfMode);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.setAttribute("data-theme", theme);
    root.setAttribute("data-power", lowPower ? "low" : "normal");
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme, lowPower]);

  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<OnePageFlow lowPower={lowPower} theme={theme} onToggleTheme={toggleTheme} />} />
        <Route path="/dashboard" element={<OnePageFlow lowPower={lowPower} theme={theme} onToggleTheme={toggleTheme} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
