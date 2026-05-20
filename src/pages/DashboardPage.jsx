import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ClockRefreshIcon } from "@untitledui/icons-react/outline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

const SENSORS = [
  { key: "nh3_mics", label: "NH3 MICS", unit: "ppm", color: "#22d3ee" },
  { key: "nh3_mems", label: "NH3 MEMS", unit: "ppm", color: "#34d399" },
  { key: "h2s", label: "H2S", unit: "ppm", color: "#f59e0b" },
  { key: "no2", label: "NO2", unit: "ppm", color: "#fb7185" },
  { key: "co", label: "CO", unit: "ppm", color: "#a78bfa" },
  { key: "mq135", label: "MQ135", unit: "raw", color: "#38bdf8" }
];

const RANGE_OPTIONS = [5, 10, 20, "all"];
const RECENT_LIMIT_OPTIONS = [5, 10, 20, "all"];
const API_QUERY_LIMIT_OPTIONS = [10, 25, 50, 100];
const MA_WINDOW_OPTIONS = [3, 5, 7, 10];
const POLL_MS_NORMAL = 5000;
const POLL_MS_LOW_POWER = 12000;
const DELAY_API_ENDPOINT = "http://45.126.43.35:5000/api/delay";
const DELAY_OFFSET_MS = 1000;

function getStatus(mq135Value) {
  if (mq135Value < 300) return { text: "NORMAL", className: "status-normal" };
  if (mq135Value < 600) return { text: "WARNING", className: "status-warning" };
  return { text: "DANGER", className: "status-danger" };
}

function parseTimeMs(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  if (value instanceof Date) {
    const dateMs = value.getTime();
    return Number.isFinite(dateMs) ? dateMs : null;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const directMs = Date.parse(raw);
  if (Number.isFinite(directMs)) {
    return directMs;
  }

  const normalized = raw
    .replace(/\s+/, "T")
    .replace(/(\.\d{3})\d+/, "$1")
    .replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
  const normalizedMs = Date.parse(normalized);
  if (Number.isFinite(normalizedMs)) {
    return normalizedMs;
  }

  const localMatch = normalized.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/
  );
  if (!localMatch) return null;

  const [, year, month, day, hour, minute, second = "0", millisecond = "0"] = localMatch;
  const localMs = new Date(
    Number.parseInt(year, 10),
    Number.parseInt(month, 10) - 1,
    Number.parseInt(day, 10),
    Number.parseInt(hour, 10),
    Number.parseInt(minute, 10),
    Number.parseInt(second, 10),
    Number.parseInt(millisecond.padEnd(3, "0"), 10)
  ).getTime();

  return Number.isFinite(localMs) ? localMs : null;
}

function parseBoundaryTimeMs(value, boundary = "start") {
  const ms = parseTimeMs(value);
  if (ms === null) return null;

  if (boundary === "end" && typeof value === "string") {
    const isMinutePrecisionLocal = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value.trim());
    if (isMinutePrecisionLocal) {
      return ms + 59_999;
    }
  }

  return ms;
}

function formatTime(isoString) {
  const ms = parseTimeMs(isoString);
  if (ms === null) return "-";

  return new Date(ms).toLocaleString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function formatTimeShort(isoString) {
  const ms = parseTimeMs(isoString);
  if (ms === null) return "-";

  return new Date(ms).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function formatNumber(value, digits = 2) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(digits) : "-";
}

function formatDelaySeconds(delayMs) {
  const num = Number(delayMs);
  if (!Number.isFinite(num)) return "-";
  return `${(num / 1000).toFixed(3)} s`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toLocalInputValue(ms) {
  const date = new Date(ms);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(ms - offsetMs).toISOString().slice(0, 16);
}

function calculateMovingAverage(values, windowSize) {
  const size = Math.max(1, Number.parseInt(String(windowSize), 10) || 1);
  const result = new Array(values.length).fill(null);
  let rolling = 0;

  for (let index = 0; index < values.length; index += 1) {
    rolling += values[index];

    if (index >= size) {
      rolling -= values[index - size];
    }

    if (index >= size - 1) {
      result[index] = rolling / size;
    }
  }

  return result;
}

const SensorChart = memo(function SensorChart({
  sensor,
  values,
  labels,
  movingAverageValues,
  movingAvgWindow,
  latestValue,
  minValue,
  maxValue,
  avgValue
}) {
  const width = 340;
  const height = 170;
  const padX = 14;
  const padY = 16;
  const plotW = width - padX * 2;
  const plotH = height - padY * 2;

  const [selectedIndex, setSelectedIndex] = useState(values.length ? values.length - 1 : 0);
  const lastIndexRef = useRef(selectedIndex);

  useEffect(() => {
    const nextIndex = values.length ? values.length - 1 : 0;
    lastIndexRef.current = nextIndex;
    setSelectedIndex(nextIndex);
  }, [values.length]);

  if (!values.length) {
    return (
      <Card className="sensor-card">
        <CardHeader className="sensor-head">
          <CardTitle>{sensor.label}</CardTitle>
          <Badge variant="outline">{sensor.unit}</Badge>
        </CardHeader>
        <CardContent>
          <div className="sensor-empty">Belum ada data.</div>
        </CardContent>
      </Card>
    );
  }

  const maNumeric = movingAverageValues.filter((value) => Number.isFinite(value));
  const domainValues = maNumeric.length ? values.concat(maNumeric) : values;

  const min = Math.min(...domainValues);
  const max = Math.max(...domainValues);
  const range = max - min || 1;

  const points = values.map((value, index) => {
    const x = padX + (index / Math.max(values.length - 1, 1)) * plotW;
    const y = padY + (1 - (value - min) / range) * plotH;
    return { x, y, value, label: labels[index] };
  });

  const normalizedIndex = clamp(selectedIndex, 0, points.length - 1);
  const selectedPoint = points[normalizedIndex];
  const selectedMovingAverage = movingAverageValues[normalizedIndex];

  const linePoints = points.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPoints = `${padX},${height - padY} ${linePoints} ${padX + plotW},${height - padY}`;
  const movingAverageLinePoints = points
    .map((point, index) => {
      const value = movingAverageValues[index];
      if (!Number.isFinite(value)) {
        return "";
      }

      const y = padY + (1 - (value - min) / range) * plotH;
      return `${point.x},${y}`;
    })
    .filter(Boolean)
    .join(" ");
  const gradientId = `grad-${sensor.key}`;

  function pickIndexFromClientX(clientX, svgRect) {
    const ratio = clamp((clientX - svgRect.left) / svgRect.width, 0, 1);
    return Math.round(ratio * (values.length - 1));
  }

  function updateIndex(nextIndex) {
    const clamped = clamp(nextIndex, 0, values.length - 1);

    if (lastIndexRef.current === clamped) {
      return;
    }

    lastIndexRef.current = clamped;
    setSelectedIndex(clamped);
  }

  function handlePointer(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const index = pickIndexFromClientX(event.clientX, rect);
    updateIndex(index);
  }

  function handleTouch(event) {
    const touch = event.touches?.[0];
    if (!touch) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const index = pickIndexFromClientX(touch.clientX, rect);
    updateIndex(index);
  }

  return (
    <Card className="sensor-card">
      <CardHeader className="sensor-head">
        <div>
          <CardTitle>{sensor.label}</CardTitle>
          <p>
            {selectedPoint.value} {sensor.unit}
          </p>
        </div>
        <Badge variant="secondary" style={{ color: sensor.color }}>
          {sensor.unit}
        </Badge>
      </CardHeader>

      <CardContent>
        <svg
          className="chart"
          viewBox={`0 0 ${width} ${height}`}
          onMouseMove={handlePointer}
          onTouchStart={handleTouch}
          onTouchMove={handleTouch}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={sensor.color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={sensor.color} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          <polygon points={areaPoints} fill={`url(#${gradientId})`} />
          <polyline points={linePoints} fill="none" stroke={sensor.color} strokeWidth="2.6" />
          {movingAverageLinePoints && (
            <polyline
              points={movingAverageLinePoints}
              fill="none"
              stroke="var(--ma-line-color)"
              strokeWidth="2.1"
              strokeDasharray="6 4"
            />
          )}

          <line
            x1={selectedPoint.x}
            y1={padY}
            x2={selectedPoint.x}
            y2={height - padY}
            className="chart-guide"
          />
          <circle cx={selectedPoint.x} cy={selectedPoint.y} r="4.7" fill={sensor.color} />
        </svg>

        <footer className="sensor-foot">
          <small>{selectedPoint.label}</small>
          <small className="sensor-ma-label">MA({movingAvgWindow}) di titik ini: {formatNumber(selectedMovingAverage)}</small>
          <div className="sensor-stats">
            <span>Now: {latestValue}</span>
            <span>Min: {minValue}</span>
            <span>Max: {maxValue}</span>
            <span>Avg: {avgValue}</span>
          </div>
        </footer>
      </CardContent>
    </Card>
  );
});

export default function DashboardPage({ lowPower = false, fluid = false }) {
  const [payload, setPayload] = useState(null);
  const [delayPayload, setDelayPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [delayLoading, setDelayLoading] = useState(true);
  const [error, setError] = useState("");
  const [delayError, setDelayError] = useState("");

  const [range, setRange] = useState(10);
  const [customRangeInput, setCustomRangeInput] = useState("15");
  const [customRangeError, setCustomRangeError] = useState("");
  const [recentLimit, setRecentLimit] = useState(10);
  const [recentLimitInput, setRecentLimitInput] = useState("10");
  const [recentLimitError, setRecentLimitError] = useState("");
  const [queryLimit, setQueryLimit] = useState(50);
  const [queryLimitInput, setQueryLimitInput] = useState("50");
  const [queryLimitError, setQueryLimitError] = useState("");
  const [selectedDevice, setSelectedDevice] = useState("all");
  const [movingAvgWindow, setMovingAvgWindow] = useState(3);

  const [timeStartInput, setTimeStartInput] = useState("");
  const [timeEndInput, setTimeEndInput] = useState("");
  const [appliedTimeRange, setAppliedTimeRange] = useState({ start: "", end: "" });
  const [timeRangeError, setTimeRangeError] = useState("");

  const [paused, setPaused] = useState(false);
  const [pageVisible, setPageVisible] = useState(!document.hidden);

  const fetchInFlightRef = useRef(false);
  const delayFetchInFlightRef = useRef(false);
  const abortRef = useRef(null);
  const delayAbortRef = useRef(null);

  const pollIntervalMs = lowPower ? POLL_MS_LOW_POWER : POLL_MS_NORMAL;

  const sortedItemsDesc = useMemo(() => {
    const items = payload?.items ?? [];

    return items
      .map((item) => ({ ...item, __ts: parseTimeMs(item.created_at) }))
      .filter((item) => item.__ts !== null)
      .sort((a, b) => b.__ts - a.__ts);
  }, [payload]);

  const delayItemsDesc = useMemo(() => {
    const items = delayPayload?.items ?? [];

    return items
      .map((item) => {
        const rawDiffMs = Number(item.diff_ms);
        const adjustedDiffMs = Number.isFinite(rawDiffMs)
          ? Math.max(0, rawDiffMs - DELAY_OFFSET_MS)
          : null;

        return {
          ...item,
          __ts: parseTimeMs(item.created_at),
          adjusted_diff_ms: adjustedDiffMs
        };
      })
      .sort((a, b) => (b.__ts ?? 0) - (a.__ts ?? 0));
  }, [delayPayload]);

  const timeFilteredItemsDesc = useMemo(() => {
    const startMs = parseBoundaryTimeMs(appliedTimeRange.start, "start");
    const endMs = parseBoundaryTimeMs(appliedTimeRange.end, "end");

    if (startMs === null && endMs === null) {
      return sortedItemsDesc;
    }

    return sortedItemsDesc.filter((item) => {
      if (startMs !== null && item.__ts < startMs) return false;
      if (endMs !== null && item.__ts > endMs) return false;
      return true;
    });
  }, [sortedItemsDesc, appliedTimeRange]);

  const availableDevices = useMemo(() => {
    const devices = new Set();

    for (const item of sortedItemsDesc) {
      if (item.device_id) {
        devices.add(item.device_id);
      }
    }

    return Array.from(devices).sort((a, b) => a.localeCompare(b));
  }, [sortedItemsDesc]);

  useEffect(() => {
    if (selectedDevice === "all") {
      return;
    }

    if (!availableDevices.includes(selectedDevice)) {
      setSelectedDevice("all");
    }
  }, [availableDevices, selectedDevice]);

  const deviceFilteredItemsDesc = useMemo(() => {
    if (selectedDevice === "all") {
      return timeFilteredItemsDesc;
    }

    return timeFilteredItemsDesc.filter((item) => item.device_id === selectedDevice);
  }, [timeFilteredItemsDesc, selectedDevice]);

  const visibleItemsDesc = useMemo(() => {
    if (range === "all") return deviceFilteredItemsDesc;
    return deviceFilteredItemsDesc.slice(0, range);
  }, [range, deviceFilteredItemsDesc]);
  const recentItemsDesc = useMemo(() => {
    if (recentLimit === "all") return deviceFilteredItemsDesc;
    return deviceFilteredItemsDesc.slice(0, recentLimit);
  }, [deviceFilteredItemsDesc, recentLimit]);
  const isRecentLimitOverAvailable =
    typeof recentLimit === "number" && recentLimit > deviceFilteredItemsDesc.length;

  const timelineItems = useMemo(() => [...visibleItemsDesc].reverse(), [visibleItemsDesc]);
  const timelineLabels = useMemo(
    () => timelineItems.map((item) => formatTimeShort(item.created_at)),
    [timelineItems]
  );

  const latest = deviceFilteredItemsDesc[0];
  const latestDelay = delayItemsDesc[0];
  const status = latest ? getStatus(latest.mq135) : null;
  const customActive = typeof range === "number" && !RANGE_OPTIONS.includes(range);
  const customRecentActive =
    typeof recentLimit === "number" && !RECENT_LIMIT_OPTIONS.includes(recentLimit);
  const queryLimitCustomActive =
    typeof queryLimit === "number" && !API_QUERY_LIMIT_OPTIONS.includes(queryLimit);
  const hasTimeFilter = Boolean(appliedTimeRange.start || appliedTimeRange.end);

  const sensorSeries = useMemo(() => {
    return SENSORS.map((sensor) => {
      const values = timelineItems.map((item) => Number(item[sensor.key] ?? 0));
      const numericValues = values.filter((value) => Number.isFinite(value));
      const movingAverageValues = calculateMovingAverage(values, movingAvgWindow);

      const minValue = numericValues.length ? formatNumber(Math.min(...numericValues)) : "-";
      const maxValue = numericValues.length ? formatNumber(Math.max(...numericValues)) : "-";
      const avgValue = numericValues.length
        ? formatNumber(numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length)
        : "-";

      return {
        sensor,
        values,
        movingAverageValues,
        minValue,
        maxValue,
        avgValue,
        latestValue: latest ? formatNumber(latest[sensor.key]) : "-"
      };
    });
  }, [timelineItems, latest, movingAvgWindow]);

  const loadData = useCallback(async (silent = false) => {
    if (fetchInFlightRef.current) {
      return;
    }

    fetchInFlightRef.current = true;

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const query = new URLSearchParams();
      if (selectedDevice !== "all") {
        query.set("device_id", selectedDevice);
      }
      if (Number.isFinite(queryLimit) && queryLimit > 0) {
        query.set("limit", String(queryLimit));
      }

      const endpoint = query.size ? `/api/data?${query.toString()}` : "/api/data";
      const response = await fetch(endpoint, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const json = await response.json();
      setPayload(json);

      setError("");
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }

      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      fetchInFlightRef.current = false;
      if (!silent) {
        setLoading(false);
      }
    }
  }, [queryLimit, selectedDevice]);

  const loadDelayData = useCallback(async (silent = false) => {
    if (delayFetchInFlightRef.current) {
      return;
    }

    delayFetchInFlightRef.current = true;

    const controller = new AbortController();
    delayAbortRef.current = controller;

    try {
      const response = await fetch(DELAY_API_ENDPOINT, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const json = await response.json();
      setDelayPayload(json);
      setDelayError("");
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }

      setDelayError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      delayFetchInFlightRef.current = false;
      if (!silent) {
        setDelayLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadData(false);
    loadDelayData(false);

    return () => {
      fetchInFlightRef.current = false;
      abortRef.current?.abort();
      delayFetchInFlightRef.current = false;
      delayAbortRef.current?.abort();
    };
  }, [loadData, loadDelayData]);

  useEffect(() => {
    function onVisibilityChange() {
      const visible = !document.hidden;
      setPageVisible(visible);

      if (visible && !paused) {
        loadData(true);
        loadDelayData(true);
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [loadData, loadDelayData, paused]);

  useEffect(() => {
    if (paused || !pageVisible) {
      return undefined;
    }

    const timer = setInterval(() => {
      loadData(true);
      loadDelayData(true);
    }, pollIntervalMs);

    return () => clearInterval(timer);
  }, [paused, pageVisible, pollIntervalMs, loadData, loadDelayData]);

  function handlePresetRange(option) {
    setRange(option);
    setCustomRangeError("");

    if (typeof option === "number") {
      setCustomRangeInput(String(option));
    }
  }

  function applyCustomRange() {
    const parsed = Number.parseInt(customRangeInput, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setCustomRangeError("Isi jumlah data valid (minimal 1)");
      return;
    }

    setRange(parsed);
    setCustomRangeError("");
  }

  function handlePresetQueryLimit(option) {
    setQueryLimit(option);
    setQueryLimitInput(String(option));
    setQueryLimitError("");
  }

  function applyQueryLimit() {
    const parsed = Number.parseInt(queryLimitInput, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setQueryLimitError("Isi limit query valid (minimal 1)");
      return;
    }

    setQueryLimit(parsed);
    setQueryLimitError("");
  }

  function handleRecentPresetLimit(option) {
    setRecentLimit(option);
    setRecentLimitError("");

    if (typeof option === "number") {
      setRecentLimitInput(String(option));

      if (!Number.isFinite(queryLimit) || option > queryLimit) {
        setQueryLimit(option);
        setQueryLimitInput(String(option));
        setQueryLimitError("");
      }
    }
  }

  function applyRecentLimit() {
    const parsed = Number.parseInt(recentLimitInput, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setRecentLimitError("Isi jumlah data valid (minimal 1)");
      return;
    }

    setRecentLimit(parsed);
    setRecentLimitError("");

    if (!Number.isFinite(queryLimit) || parsed > queryLimit) {
      setQueryLimit(parsed);
      setQueryLimitInput(String(parsed));
      setQueryLimitError("");
    }
  }

  function applyTimeRange() {
    const startMs = parseBoundaryTimeMs(timeStartInput, "start");
    const endMs = parseBoundaryTimeMs(timeEndInput, "end");

    if (!timeStartInput && !timeEndInput) {
      setTimeRangeError("Isi minimal start atau end time.");
      return;
    }
    if (timeStartInput && startMs === null) {
      setTimeRangeError("Start time tidak valid.");
      return;
    }
    if (timeEndInput && endMs === null) {
      setTimeRangeError("End time tidak valid.");
      return;
    }
    if (startMs !== null && endMs !== null && startMs > endMs) {
      setTimeRangeError("Start time harus lebih awal dari end time.");
      return;
    }

    setAppliedTimeRange({ start: timeStartInput, end: timeEndInput });
    setTimeRangeError("");
  }

  function resetTimeRange() {
    setTimeStartInput("");
    setTimeEndInput("");
    setAppliedTimeRange({ start: "", end: "" });
    setTimeRangeError("");
  }

  function applyQuickWindow(hours) {
    const endMs = latest?.__ts ?? Date.now();
    const startMs = endMs - hours * 60 * 60 * 1000;

    const startValue = toLocalInputValue(startMs);
    const endValue = toLocalInputValue(endMs);

    setTimeStartInput(startValue);
    setTimeEndInput(endValue);
    setAppliedTimeRange({ start: startValue, end: endValue });
    setTimeRangeError("");
  }

  const headerAnimation = lowPower
    ? {}
    : {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.28 }
      };

  return (
    <main className={`page dashboard-page theme ${fluid ? "flow-page" : ""}`}>
      <section className="container">
        <motion.header className="hero dashboard-hero" {...headerAnimation}>
          <div>
            <Badge variant="outline" className="mb-2">GOD</Badge>
            <h1>GOD Sensor Dashboard</h1>
            <p className="subtitle">
              Garbage Odor Detection dengan filter jumlah data dan custom by waktu.
              {lowPower ? " Mode hemat daya aktif." : ""}
            </p>
          </div>

          <div className="actions">
            <Button type="button" variant="secondary" onClick={() => setPaused((prev) => !prev)}>
              <ClockRefreshIcon className="ui-icon" />
              <span>
                {paused
                  ? `Lanjutkan Auto Refresh (${pollIntervalMs / 1000} detik)`
                  : `Jeda Auto Refresh (${pollIntervalMs / 1000} detik)`}
              </span>
            </Button>
          </div>
        </motion.header>

        <div className="cards summary-cards">
          <Card className="card">
            <CardHeader>
              <CardDescription>Device</CardDescription>
              <CardTitle className="value">{selectedDevice === "all" ? "Semua Device" : selectedDevice}</CardTitle>
            </CardHeader>
          </Card>

          <Card className="card">
            <CardHeader>
              <CardDescription>Status</CardDescription>
              <CardTitle className={`value ${status ? status.className : ""}`}>
                {status ? status.text : "-"}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="card">
            <CardHeader>
              <CardDescription>Last Update</CardDescription>
              <CardTitle className="value small">{latest ? formatTime(latest.created_at) : "-"}</CardTitle>
            </CardHeader>
          </Card>

          <Card className="card">
            <CardHeader>
              <CardDescription>Total Rows API</CardDescription>
              <CardTitle className="value">{payload?.count ?? 0}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card className="panel controls-panel">
          <CardHeader>
            <CardTitle>Kontrol Data</CardTitle>
            <CardDescription>
              Polling {pollIntervalMs / 1000} detik {pageVisible ? "(tab aktif)" : "(tab tidak aktif)"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="control-grid">
              <Card className="control-card">
                <CardHeader>
                  <CardTitle>Jumlah Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="control-select-grid">
                    <label className="control-select fancy-field">
                      <span className="field-label">Device Aktif</span>
                      <span className="field-shell">
                        <select
                          value={selectedDevice}
                          onChange={(event) => setSelectedDevice(event.target.value)}
                          className="select-field"
                        >
                          <option value="all">Semua Device</option>
                          {availableDevices.map((deviceId) => (
                            <option key={deviceId} value={deviceId}>
                              {deviceId}
                            </option>
                          ))}
                        </select>
                        <span className="select-caret" aria-hidden>▾</span>
                      </span>
                    </label>

                    <label className="control-select fancy-field">
                      <span className="field-label">Moving Average</span>
                      <span className="field-shell">
                        <select
                          value={movingAvgWindow}
                          onChange={(event) => setMovingAvgWindow(Number.parseInt(event.target.value, 10) || 3)}
                          className="select-field"
                        >
                          {MA_WINDOW_OPTIONS.map((windowOption) => (
                            <option key={windowOption} value={windowOption}>
                              MA ({windowOption})
                            </option>
                          ))}
                        </select>
                        <span className="select-caret" aria-hidden>▾</span>
                      </span>
                    </label>
                  </div>

                  <div className="range-buttons">
                    {API_QUERY_LIMIT_OPTIONS.map((option) => (
                      <Button
                        type="button"
                        key={`query-limit-${option}`}
                        variant={option === queryLimit ? "default" : "outline"}
                        className={option === queryLimit ? "active" : ""}
                        onClick={() => handlePresetQueryLimit(option)}
                      >
                        Query {option}
                      </Button>
                    ))}
                  </div>

                  <div className="custom-range">
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      value={queryLimitInput}
                      onChange={(event) => setQueryLimitInput(event.target.value)}
                      placeholder="Custom limit query API"
                    />
                    <Button
                      type="button"
                      onClick={applyQueryLimit}
                      variant={queryLimitCustomActive ? "default" : "outline"}
                      className={queryLimitCustomActive ? "active" : ""}
                    >
                      Terapkan Query
                    </Button>
                  </div>
                  {queryLimitError && <p className="error compact">{queryLimitError}</p>}
                  {!queryLimitError && (
                    <p className="filter-pill">
                      Query API aktif: device = {selectedDevice === "all" ? "all" : selectedDevice}
                      {" | "}
                      limit = {queryLimit}
                    </p>
                  )}

                  <div className="range-buttons">
                    {RANGE_OPTIONS.map((option) => (
                      <Button
                        type="button"
                        key={option}
                        variant={option === range ? "default" : "outline"}
                        className={option === range ? "active" : ""}
                        onClick={() => handlePresetRange(option)}
                      >
                        {option === "all" ? "Semua" : `${option} data`}
                      </Button>
                    ))}
                  </div>

                  <div className="custom-range">
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      value={customRangeInput}
                      onChange={(event) => setCustomRangeInput(event.target.value)}
                      placeholder="Jumlah data custom"
                    />
                    <Button
                      type="button"
                      onClick={applyCustomRange}
                      variant={customActive ? "default" : "outline"}
                      className={customActive ? "active" : ""}
                    >
                      Terapkan
                    </Button>
                  </div>
                  {customRangeError && <p className="error compact">{customRangeError}</p>}
                </CardContent>
              </Card>

              <Card className="control-card">
                <CardHeader>
                  <CardTitle>Custom By Waktu</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="time-inputs">
                    <label className="time-field">
                      <span className="time-label">Start</span>
                      <span className="time-input-shell">
                        <Input
                          type="datetime-local"
                          value={timeStartInput}
                          onChange={(event) => setTimeStartInput(event.target.value)}
                          className="time-input"
                        />
                      </span>
                    </label>

                    <label className="time-field">
                      <span className="time-label">End</span>
                      <span className="time-input-shell">
                        <Input
                          type="datetime-local"
                          value={timeEndInput}
                          onChange={(event) => setTimeEndInput(event.target.value)}
                          className="time-input"
                        />
                      </span>
                    </label>
                  </div>

                  <div className="time-actions">
                    <Button type="button" onClick={applyTimeRange}>Apply Waktu</Button>
                    <Button type="button" variant="outline" onClick={resetTimeRange}>Reset</Button>
                  </div>

                  <div className="quick-window">
                    <Button type="button" variant="outline" onClick={() => applyQuickWindow(1)}>1 Jam</Button>
                    <Button type="button" variant="outline" onClick={() => applyQuickWindow(6)}>6 Jam</Button>
                    <Button type="button" variant="outline" onClick={() => applyQuickWindow(24)}>24 Jam</Button>
                  </div>

                  {hasTimeFilter && (
                    <p className="filter-pill">
                      Filter aktif: {appliedTimeRange.start ? formatTime(appliedTimeRange.start) : "-"}
                      {" -> "}
                      {appliedTimeRange.end ? formatTime(appliedTimeRange.end) : "-"}
                    </p>
                  )}
                  {timeRangeError && <p className="error compact">{timeRangeError}</p>}
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {loading && <p className="info">Loading data...</p>}
        {error && <p className="error">Gagal ambil data: {error}</p>}

        <Card className="panel">
          <CardHeader>
            <CardTitle>Panel Delay Device</CardTitle>
            <CardDescription>
              Data dari endpoint delay dengan pengurangan 1 detik ({DELAY_OFFSET_MS} ms) pada nilai delay.
            </CardDescription>
            <Separator />
          </CardHeader>
          <CardContent>
            {delayLoading && <p className="info">Loading delay data...</p>}
            {delayError && <p className="error compact">Gagal ambil data delay: {delayError}</p>}

            {!delayLoading && !delayError && latestDelay && (
              <div className="cards">
                <Card className="card">
                  <CardHeader>
                    <CardDescription>Delay Setelah Dikurangi 1s</CardDescription>
                    <CardTitle className="value">{formatDelaySeconds(latestDelay.adjusted_diff_ms)}</CardTitle>
                  </CardHeader>
                </Card>
                <Card className="card">
                  <CardHeader>
                    <CardDescription>Delay Asli</CardDescription>
                    <CardTitle className="value">{formatDelaySeconds(latestDelay.diff_ms)}</CardTitle>
                  </CardHeader>
                </Card>
                <Card className="card">
                  <CardHeader>
                    <CardDescription>Device</CardDescription>
                    <CardTitle className="value">{latestDelay.device_id ?? "-"}</CardTitle>
                  </CardHeader>
                </Card>
                <Card className="card">
                  <CardHeader>
                    <CardDescription>Created At</CardDescription>
                    <CardTitle className="value small">{formatTime(latestDelay.created_at)}</CardTitle>
                  </CardHeader>
                </Card>
              </div>
            )}

            {!delayLoading && !delayError && !delayItemsDesc.length && (
              <p className="info">Belum ada data delay.</p>
            )}

            {!delayLoading && !delayError && delayItemsDesc.length > 0 && (
              <>
                <div className="table-wrap desktop-table">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Device</th>
                        <th>Sensor Data ID</th>
                        <th>Delay (Asli)</th>
                        <th>Delay (-1s)</th>
                        <th>Device Time</th>
                        <th>Received Time</th>
                        <th>Created At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {delayItemsDesc.map((item) => (
                        <tr key={item.id}>
                          <td>{item.id}</td>
                          <td>{item.device_id}</td>
                          <td>{item.sensor_data_id}</td>
                          <td>{formatDelaySeconds(item.diff_ms)}</td>
                          <td>{formatDelaySeconds(item.adjusted_diff_ms)}</td>
                          <td>{formatTime(item.device_timestamp_ms)}</td>
                          <td>{formatTime(item.received_timestamp_ms)}</td>
                          <td>{formatTime(item.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mobile-list">
                  {delayItemsDesc.map((item) => (
                    <article key={item.id} className="mobile-row">
                      <div className="mobile-row-head">
                        <strong>#{item.id}</strong>
                        <span>{item.device_id}</span>
                      </div>
                      <div className="mobile-row-grid">
                        <p>Sensor Data ID: {item.sensor_data_id}</p>
                        <p>Delay Asli: {formatDelaySeconds(item.diff_ms)}</p>
                        <p>Delay -1s: {formatDelaySeconds(item.adjusted_diff_ms)}</p>
                        <p>Device Time: {formatTime(item.device_timestamp_ms)}</p>
                        <p>Received Time: {formatTime(item.received_timestamp_ms)}</p>
                      </div>
                      <small>{formatTime(item.created_at)}</small>
                    </article>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <section className="sensor-grid">
          {sensorSeries.map((series) => (
            <SensorChart
              key={series.sensor.key}
              sensor={series.sensor}
              values={series.values}
              labels={timelineLabels}
              movingAverageValues={series.movingAverageValues}
              movingAvgWindow={movingAvgWindow}
              latestValue={series.latestValue}
              minValue={series.minValue}
              maxValue={series.maxValue}
              avgValue={series.avgValue}
            />
          ))}
        </section>

        <Card className="panel">
          <CardHeader>
            <CardTitle>
              Recent Sensor Data ({recentItemsDesc.length})
            </CardTitle>
            <CardDescription>
              Menampilkan {recentItemsDesc.length} data terbaru setelah filter device dan waktu.
              Data tersedia dari API saat ini: {deviceFilteredItemsDesc.length}.
            </CardDescription>
            <Separator />
          </CardHeader>
          <CardContent>
            <div className="range-buttons">
              {RECENT_LIMIT_OPTIONS.map((option) => (
                <Button
                  type="button"
                  key={`recent-${option}`}
                  variant={option === recentLimit ? "default" : "outline"}
                  className={option === recentLimit ? "active" : ""}
                  onClick={() => handleRecentPresetLimit(option)}
                >
                  {option === "all" ? "Semua" : `${option} data`}
                </Button>
              ))}
            </div>

            <div className="custom-range">
              <Input
                type="number"
                min="1"
                step="1"
                value={recentLimitInput}
                onChange={(event) => setRecentLimitInput(event.target.value)}
                placeholder="Jumlah data recent"
              />
              <Button
                type="button"
                onClick={applyRecentLimit}
                variant={customRecentActive ? "default" : "outline"}
                className={customRecentActive ? "active" : ""}
              >
                Terapkan
              </Button>
            </div>
            {recentLimitError && <p className="error compact">{recentLimitError}</p>}
            {!recentLimitError && isRecentLimitOverAvailable && (
              <p className="info">
                Batas diminta {recentLimit} data, tapi API saat ini hanya menyediakan{" "}
                {deviceFilteredItemsDesc.length} data.
              </p>
            )}

            <div className="table-wrap desktop-table">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Device</th>
                    <th>NH3 MICS</th>
                    <th>NH3 MEMS</th>
                    <th>H2S</th>
                    <th>NO2</th>
                    <th>CO</th>
                    <th>MQ135</th>
                    <th>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {recentItemsDesc.map((item) => (
                    <tr key={item.id}>
                      <td>{item.id}</td>
                      <td>{item.device_id}</td>
                      <td>{item.nh3_mics}</td>
                      <td>{item.nh3_mems}</td>
                      <td>{item.h2s}</td>
                      <td>{item.no2}</td>
                      <td>{item.co}</td>
                      <td>{item.mq135}</td>
                      <td>{formatTime(item.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mobile-list">
              {recentItemsDesc.map((item) => (
                <article key={item.id} className="mobile-row">
                  <div className="mobile-row-head">
                    <strong>#{item.id}</strong>
                    <span>{item.device_id}</span>
                  </div>
                  <div className="mobile-row-grid">
                    <p>NH3 MICS: {item.nh3_mics}</p>
                    <p>NH3 MEMS: {item.nh3_mems}</p>
                    <p>H2S: {item.h2s}</p>
                    <p>NO2: {item.no2}</p>
                    <p>CO: {item.co}</p>
                    <p>MQ135: {item.mq135}</p>
                  </div>
                  <small>{formatTime(item.created_at)}</small>
                </article>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
