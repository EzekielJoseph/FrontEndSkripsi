let chart;

function getStatus(gas) {
    if (gas < 300) return { text: "NORMAL", color: "lightgreen" };
    if (gas < 600) return { text: "WARNING", color: "orange" };
    return { text: "DANGER", color: "red" };
}

async function getData() {
    const response = await fetch("http://localhost:8000/api/data");
    const data = await response.json();
    return data;
}

async function updateDashboard() {
    const data = await getData();

    const labels = data.map(d => d.timestamp);
    const values = data.map(d => d.gas);

    const latest = data[data.length - 1];

    // Update Text
    document.getElementById("gasValue").innerText = latest.gas;

    const status = getStatus(latest.gas);
    const statusEl = document.getElementById("statusValue");
    statusEl.innerText = status.text;
    statusEl.style.color = status.color;

    document.getElementById("timeValue").innerText = latest.timestamp;

    // Chart
    if (chart) chart.destroy();

    const ctx = document.getElementById("gasChart");

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Gas Level',
                data: values,
                borderColor: '#38bdf8',
                tension: 0.3
            }]
        },
        options: {
            plugins: {
                legend: {
                    labels: { color: "white" }
                }
            },
            scales: {
                x: {
                    ticks: { color: "white" }
                },
                y: {
                    ticks: { color: "white" }
                }
            }
        }
    });
}

// refresh tiap 3 detik
setInterval(updateDashboard, 3000);

updateDashboard();