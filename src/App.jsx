import { useEffect, useMemo, useState } from "react";

function getStatus(mq135Value) {
  if (mq135Value < 300) {
    return { text: "NORMAL", className: "status-normal" };
  }

  if (mq135Value < 600) {
    return { text: "WARNING", className: "status-warning" };
  }

  return { text: "DANGER", className: "status-danger" };
}

function formatTime(isoString) {
  if (!isoString) {
    return "-";
  }

  return new Date(isoString).toLocaleString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

export default function App() {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const sortedItems = useMemo(() => {
    const items = payload?.items ?? [];
    return [...items].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [payload]);

  const latest = sortedItems[0];
  const status = latest ? getStatus(latest.mq135) : null;

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

    const timer = setInterval(() => {
      loadData();
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  return (
    <main className="page">
      <section className="container">
        <h1>IoT Odor Sensor Dashboard</h1>
        <p className="subtitle">Data source: device-01 via Hono proxy</p>

        <div className="cards">
          <article className="card">
            <h2>MQ135</h2>
            <p className="value">{latest ? latest.mq135 : "-"}</p>
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
        </div>

        {loading && <p className="info">Loading data...</p>}
        {error && <p className="error">Gagal ambil data: {error}</p>}

        <section className="panel">
          <h3>Latest Sensor Rows ({payload?.count ?? 0})</h3>
          <div className="table-wrap">
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
                {sortedItems.map((item) => (
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
        </section>
      </section>
    </main>
  );
}
