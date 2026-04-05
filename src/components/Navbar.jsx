import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Menu01Icon,
  Moon01Icon,
  SunIcon,
  XCloseIcon,
  ZapIcon
} from "@untitledui/icons-react/outline";

const links = [
  { to: "/", label: "Landing", end: true },
  { to: "/dashboard", label: "Dashboard", end: false }
];

export default function Navbar({ theme, onToggleTheme }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="navbar">
      <div className="nav-inner">
        <NavLink to="/" className="brand" onClick={() => setOpen(false)}>
          <ZapIcon className="brand-icon" />
          <span>GOON</span>
        </NavLink>

        <button
          type="button"
          className="menu-btn"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-label="Toggle navigation"
        >
          {open ? <XCloseIcon className="ui-icon" /> : <Menu01Icon className="ui-icon" />}
          <span>Menu</span>
        </button>

        <nav className={`nav-links ${open ? "open" : ""}`}>
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              {link.label}
            </NavLink>
          ))}

          <button type="button" className="theme-btn" onClick={onToggleTheme}>
            {theme === "dark" ? <SunIcon className="ui-icon" /> : <Moon01Icon className="ui-icon" />}
            <span>{theme === "dark" ? "Light" : "Dark"}</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
