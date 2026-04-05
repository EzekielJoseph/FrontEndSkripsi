import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ActivityIcon,
  ArrowRightIcon,
  BarChartSquare02Icon,
  ClockIcon,
  ZapIcon
} from "@untitledui/icons-react/outline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

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

export default function LandingPage({ lowPower = false, onEnterDashboard, fluid = false }) {
  const hasFluidAction = typeof onEnterDashboard === "function";

  const heroLeftAnimation = lowPower
    ? {}
    : {
        initial: { opacity: 0, x: -26 },
        animate: { opacity: 1, x: 0 },
        transition: { duration: 0.45 }
      };

  const heroRightAnimation = lowPower
    ? {}
    : {
        initial: { opacity: 0, x: 26 },
        animate: { opacity: 1, x: 0 },
        transition: { duration: 0.45, delay: 0.12 }
      };

  return (
    <main className={`page landing-page ${fluid ? "flow-page" : ""}`}>
      <section className="container">
        <div className="landing-grid">
          <motion.div className="landing-copy" {...heroLeftAnimation}>
            <Badge variant="secondary" className="eyebrow">
              <ZapIcon className="ui-icon" />
              GOD Platform
            </Badge>
            <h1>GOD (Garbage Odor Detection)</h1>
            <p className="lead">
              GOD adalah landing page untuk pemantauan kualitas udara berbasis IoT. Dari sini,
              pengguna bisa langsung masuk ke dashboard sensor yang interaktif dengan analitik waktu nyata.
            </p>

            <div className="hero-actions">
              {hasFluidAction ? (
                <Button type="button" size="lg" className="btn-primary" onClick={onEnterDashboard}>
                  <span>Buka Dashboard GOD</span>
                  <ArrowRightIcon className="ui-icon" />
                </Button>
              ) : (
                <Button asChild size="lg" className="btn-primary">
                  <Link to="/dashboard">
                    <span>Buka Dashboard GOD</span>
                    <ArrowRightIcon className="ui-icon" />
                  </Link>
                </Button>
              )}
              <Button asChild variant="outline" size="lg">
                <a href="#fitur">Lihat Fitur</a>
              </Button>
            </div>
          </motion.div>

          <motion.div className="landing-visual" {...heroRightAnimation}>
            <Card className="visual-card pulse-a">
              <CardContent>
                <span>GOD NH3</span>
                <strong>11.8 ppm</strong>
              </CardContent>
            </Card>
            <Card className="visual-card pulse-b">
              <CardContent>
                <span>GOD MQ135</span>
                <strong>220.5 raw</strong>
              </CardContent>
            </Card>
            <Card className="visual-card pulse-c">
              <CardContent>
                <span>GOD Status</span>
                <strong>NORMAL</strong>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <section id="fitur" className="feature-section">
          {FEATURES.map((feature, idx) => {
            const Icon = feature.icon;
            const cardAnimation = lowPower
              ? {}
              : {
                  initial: { opacity: 0, y: 24 },
                  whileInView: { opacity: 1, y: 0 },
                  viewport: { once: true, amount: 0.35 },
                  transition: { duration: 0.35, delay: idx * 0.08 }
                };

            return (
              <motion.article
                key={feature.title}
                className="feature-card"
                {...cardAnimation}
              >
                <Card className="h-full">
                  <CardHeader>
                    <span className="feature-icon-wrap">
                      <Icon className="ui-icon" />
                    </span>
                    <CardTitle>{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>{feature.text}</p>
                  </CardContent>
                </Card>
              </motion.article>
            );
          })}
        </section>
      </section>
    </main>
  );
}
