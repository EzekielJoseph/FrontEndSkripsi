import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ClockRefreshIcon,
  RefreshCw01Icon
} from "@untitledui/icons-react/outline";

const SENSORS = [
  { key: "nh3_mics", label: "NH3 MICS", unit: "ppm", color: "#22d3ee" },
  { key: "nh3_mems", label: "NH3 MEMS", unit: "ppm", color: "#34d399" },
  { key: "h2s", label: "H2S", unit: "ppm", color: "#f59e0b" },
  { key: "no2", label: "NO2", unit: "ppm", color: "#fb7185" },
  { key: "co", label: "CO", unit: "ppm", color: "#a78bfa" },
  { key: "mq135", label: "MQ135", unit: "raw", color: "#38bdf8" }
];

const RANGE_OPTIONS = [5, 10, 20, "all"];

function getStatus(mq135Value) {
  if (mq135Value < 300) {
    return { text: "NORMAL", className: "status-normal" };
  }

  if (mq135Value < 600) {
    return { text: "WARNING", className: "status-warning" };
  }

  return { text: "DANGER", className: "status-danger" };
}

function parseTimeMs(value) {
  if (!value) {
    return null;
  }

  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function formatTime(isoString) {
  const ms = parseTimeMs(isoString);

  if (ms === null) {
    return "-";
  }

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

  if (ms === null) {
    return "-";
  }

  return new Date(ms).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function formatNumber(value, digits = 2) {
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(digits) : "-";
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toLocalInputValue(ms) {
  const date = new Date(ms);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(ms - offsetMs).toISOString().slice(0, 16);
}

function SensorChart({
  sensor,
  values,
  labels,
  selectedIndex,
  onChangeSelected,
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

  if (!values.length) {
    return (
      <article className="sensor-card">
        <header className="sensor-head">
          <h3>{sensor.label}</h3>
          <span>{sensor.unit}</span>
        </header>
        <div className="sensor-empty">Belum ada data.</div>
      </article>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((value, index) => {
    const x = padX + (index / Math.max(values.length - 1, 1)) * plotW;
    const y = padY + (1 - (value - min) / range) * plotH;
    return { x, y, value, label: labels[index] };
  });

  const normalizedIndex = clamp(
    selectedIndex ?? points.length - 1,
    0,
    points.length - 1
  );
  const selectedPoint = points[normalizedIndex];

  const linePoints = points.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPoints = `${padX},${height - padY} ${linePoints} ${padX + plotW},${height - padY}`;

  const gradientId = `grad-${sensor.key}`;

  function pickIndexFromClientX(clientX, svgRect) {
    const ratio = clamp((clientX - svgRect.left) / svgRect.width, 0, 1);
    return Math.round(ratio * (values.length - 1));
  }

  function handlePointer(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const index = pickIndexFromClientX(event.clientX, rect);
    onChangeSelected(sensor.key, index);
  }

  function handleTouch(event) {
    const touch = event.touches?.[0];

    if (!touch) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const index = pickIndexFromClientX(touch.clientX, rect);
    onChangeSelected(sensor.key, index);
  }

  return (
    <article className="sensor-card">
      <header className="sensor-head">
        <div>
          <h3>{sensor.label}</h3>
          <p>
            {selectedPoint.value} {sensor.unit}
          </p>
        </div>
        <span style={{ color: sensor.color }}>{sensor.unit}</span>
      </header>

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
        <div className="sensor-stats">
          <span>Now: {latestValue}</span>
          <span>Min: {minValue}</span>
          <span>Max: {maxValue}</span>
          <span>Avg: {avgValue}</span>
        </div>
      </footer>
    </article>
  );
}

export default function DashboardPage() {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [range, setRange] = useState(10);
  const [customRangeInput, setCustomRangeInput] = useState("15");
  const [customRangeError, setCustomRangeError] = useState("");

  const [timeStartInput, setTimeStartInput] = useState("");
  const [timeEndInput, setTimeEndInput] = useState("");
  const [appliedTimeRange, setAppliedTimeRange] = useState({ start: "", end: "" });
  const [timeRangeError, setTimeRangeError] = useState("");

  const [paused, setPaused] = useState(false);
  const [selectedPoints, setSelectedPoints] = useState({});

  const sortedItemsDesc = useMemo(() => {
    const items = payload?.items ?? [];

    return [...items].sort(
      (a, b) => parseTimeMs(b.created_at) - parseTimeMs(a.created_at)
    );
  }, [payload]);

  const timeFilteredItemsDesc = useMemo(() => {
    const startMs = parseTimeMs(appliedTimeRange.start);
    const endMs = parseTimeMs(appliedTimeRange.end);

    if (startMs === null && endMs === null) {
      return sortedItemsDesc;
    }

    return sortedItemsDesc.filter((item) => {
      const itemMs = parseTimeMs(item.created_at);

      if (itemMs === null) {
        return false;
      }

      if (startMs !== null && itemMs < startMs) {
        return false;
      }

      if (endMs !== null && itemMs > endMs) {
        return false;
      }

      return true;
    });
  }, [sortedItemsDesc, appliedTimeRange]);

  const visibleItemsDesc = useMemo(() => {
    if (range === "all") {
      return timeFilteredItemsDesc;
    }

    return timeFilteredItemsDesc.slice(0, range);
  }, [range, timeFilteredItemsDesc]);

  const timelineItems = useMemo(() => {
    return [...visibleItemsDesc].reverse();
  }, [visibleItemsDesc]);

  const latest = sortedItemsDesc[0];
  const status = latest ? getStatus(latest.mq135) : null;
  const customActive = typeof range === "number" && !RANGE_OPTIONS.includes(range);
  const hasTimeFilter = Boolean(appliedTimeRange.start || appliedTimeRange.end);

  async function loadData() {
    try {
      const response = await fetch("/api/data");

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();
      setPayload(json);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (paused) {
      return undefined;
    }

    const timer = setInterval(() => {
      loadData();
    }, 3000);

    return () => clearInterval(timer);
  }, [paused]);

  function updateSelectedPoint(sensorKey, index) {
    setSelectedPoints((prev) => ({
      ...prev,
      [sensorKey]: index
    }));
  }

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

  function applyTimeRange() {
    const startMs = parseTimeMs(timeStartInput);
    const endMs = parseTimeMs(timeEndInput);

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
    const endMs = parseTimeMs(sortedItemsDesc[0]?.created_at) ?? Date.now();
    const startMs = endMs - hours * 60 * 60 * 1000;

    const startValue = toLocalInputValue(startMs);
    const endValue = toLocalInputValue(endMs);

    setTimeStartInput(startValue);
    setTimeEndInput(endValue);
    setAppliedTimeRange({ start: startValue, end: endValue });
    setTimeRangeError("");
  }

  return (
    <main className="page dashboard-page">
      <section className="container">
        <motion.header
          className="hero dashboard-hero"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
        >
          <div>
            <h1>GOON Sensor Dashboard</h1>
            <p className="subtitle">Gas OdOr detectioN dengan filter jumlah data dan custom by waktu.</p>
          </div>

          <div className="actions">
            <button type="button" onClick={loadData}>
              <RefreshCw01Icon className="ui-icon" />
              <span>Refresh</span>
            </button>
            <button type="button" onClick={() => setPaused((prev) => !prev)}>
              <ClockRefreshIcon className="ui-icon" />
              <span>{paused ? "Resume Auto" : "Pause Auto"}</span>
            </button>
          </div>
        </motion.header>

        <div className="cards summary-cards">
          <article className="card">
            <h2>Device</h2>
            <p className="value">{latest?.device_id ?? "-"}</p>
          </article>

          <article className="card">
            <h2>Status</h2>
            <p className={`value ${status ? status.className : ""}`}>
              {status ? status.text : "-"}
            </p>
          </article>

          <article className="card">
            <h2>Last Update</h2>
            <p className="value small">{latest ? formatTime(latest.created_at) : "-"}</p>
          </article>

          <article className="card">
            <h2>Total Rows API</h2>
            <p className="value">{payload?.count ?? 0}</p>
          </article>
        </div>

        <section className="panel controls-panel">
          <h3>Kontrol Data</h3>

          <div className="control-grid">
            <article className="control-card">
              <h4>Jumlah Data</h4>
              <div className="range-buttons">
                {RANGE_OPTIONS.map((option) => (
                  <button
                    type="button"
                    key={option}
                    className={option === range ? "active" : ""}
                    onClick={() => handlePresetRange(option)}
                  >
                    {option === "all" ? "Semua" : `${option} data`}
                  </button>
                ))}
              </div>

              <div className="custom-range">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={customRangeInput}
                  onChange={(event) => setCustomRangeInput(event.target.value)}
                  placeholder="Jumlah data custom"
                />
                <button
                  type="button"
                  onClick={applyCustomRange}
                  className={customActive ? "active" : ""}
                >
                  Terapkan
                </button>
              </div>
              {customRangeError && <p className="error compact">{customRangeError}</p>}
            </article>

            <article className="control-card">
              <h4>Custom By Waktu</h4>

              <div className="time-inputs">
                <label>
                  Start
                  <input
                    type="datetime-local"
                    value={timeStartInput}
                    onChange={(event) => setTimeStartInput(event.target.value)}
                  />
                </label>

                <label>
                  End
                  <input
                    type="datetime-local"
                    value={timeEndInput}
                    onChange={(event) => setTimeEndInput(event.target.value)}
                  />
                </label>
              </div>

              <div className="time-actions">
                <button type="button" onClick={applyTimeRange}>
                  Apply Waktu
                </button>
                <button type="button" onClick={resetTimeRange}>
                  Reset
                </button>
              </div>

              <div className="quick-window">
                <button type="button" onClick={() => applyQuickWindow(1)}>
                  1 Jam
                </button>
                <button type="button" onClick={() => applyQuickWindow(6)}>
                  6 Jam
                </button>
                <button type="button" onClick={() => applyQuickWindow(24)}>
                  24 Jam
                </button>
              </div>

              {hasTimeFilter && (
                <p className="filter-pill">
                  Filter aktif: {appliedTimeRange.start ? formatTime(appliedTimeRange.start) : "-"}
                  {" -> "}
                  {appliedTimeRange.end ? formatTime(appliedTimeRange.end) : "-"}
                </p>
              )}
              {timeRangeError && <p className="error compact">{timeRangeError}</p>}
            </article>
          </div>
        </section>

        {loading && <p className="info">Loading data...</p>}
        {error && <p className="error">Gagal ambil data: {error}</p>}

        <section className="sensor-grid">
          {SENSORS.map((sensor) => {
            const values = timelineItems.map((item) => Number(item[sensor.key] ?? 0));
            const numericValues = values.filter((value) => Number.isFinite(value));

            const minValue = numericValues.length ? formatNumber(Math.min(...numericValues)) : "-";
            const maxValue = numericValues.length ? formatNumber(Math.max(...numericValues)) : "-";
            const avgValue = numericValues.length
              ? formatNumber(
                  numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length
                )
              : "-";

            return (
              <SensorChart
                key={sensor.key}
                sensor={sensor}
                values={values}
                labels={timelineItems.map((item) => formatTimeShort(item.created_at))}
                selectedIndex={selectedPoints[sensor.key]}
                onChangeSelected={updateSelectedPoint}
                latestValue={latest ? formatNumber(latest[sensor.key]) : "-"}
                minValue={minValue}
                maxValue={maxValue}
                avgValue={avgValue}
              />
            );
          })}
        </section>

        <section className="panel">
          <h3>Recent Sensor Data ({visibleItemsDesc.length})</h3>

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
                {visibleItemsDesc.map((item) => (
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
            {visibleItemsDesc.map((item) => (
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
        </section>
      </section>
    </main>
  );
}
