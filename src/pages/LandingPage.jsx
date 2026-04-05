import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ActivityIcon,
  ArrowRightIcon,
  BarChartSquare02Icon,
  ClockIcon,
  ZapIcon
} from "@untitledui/icons-react/outline";

const FEATURES = [
  {
    title: "Live Sensor Feed",
    text: "Monitor NH3, H2S, NO2, CO, dan MQ135 secara real-time dari device IoT.",
    icon: ActivityIcon
  },
  {
    title: "Interactive Charts",
    text: "Setiap sensor punya grafik sendiri dengan hover insight dan statistik cepat.",
    icon: BarChartSquare02Icon
  },
  {
    title: "Time Window Filter",
    text: "Analisis data berdasar jam tertentu dengan custom start-end time.",
    icon: ClockIcon
  }
];

export default function LandingPage() {
  return (
    <main className="page landing-page">
      <section className="container">
        <div className="landing-grid">
          <motion.div
            className="landing-copy"
            initial={{ opacity: 0, x: -26 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45 }}
          >
            <p className="eyebrow">
              <ZapIcon className="ui-icon" />
              GOON Platform
            </p>
            <h1>GOON (Gas OdOr detectioN)</h1>
            <p className="lead">
              GOON adalah landing page untuk pemantauan kualitas udara berbasis IoT. Dari sini,
              pengguna bisa langsung masuk ke dashboard sensor yang interaktif dengan analitik waktu nyata.
            </p>

            <div className="hero-actions">
              <Link className="btn btn-primary" to="/dashboard">
                <span>Buka Dashboard GOON</span>
                <ArrowRightIcon className="ui-icon" />
              </Link>
              <a className="btn btn-secondary" href="#fitur">
                Lihat Fitur
              </a>
            </div>
          </motion.div>

          <motion.div
            className="landing-visual"
            initial={{ opacity: 0, x: 26 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.12 }}
          >
            <div className="visual-card pulse-a">
              <span>GOON NH3</span>
              <strong>11.8 ppm</strong>
            </div>
            <div className="visual-card pulse-b">
              <span>GOON MQ135</span>
              <strong>220.5 raw</strong>
            </div>
            <div className="visual-card pulse-c">
              <span>GOON Status</span>
              <strong>NORMAL</strong>
            </div>
          </motion.div>
        </div>

        <section id="fitur" className="feature-section">
          {FEATURES.map((feature, idx) => {
            const Icon = feature.icon;

            return (
              <motion.article
                key={feature.title}
                className="feature-card"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.35, delay: idx * 0.08 }}
              >
                <span className="feature-icon-wrap">
                  <Icon className="ui-icon" />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </motion.article>
            );
          })}
        </section>
      </section>
    </main>
  );
}
