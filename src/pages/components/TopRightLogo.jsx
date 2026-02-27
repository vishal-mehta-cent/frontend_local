// src/components/TopRightLogo.jsx
import React from "react";
import { useLocation, Link } from "react-router-dom";
import logo from "../assets/logo.png"; // <-- put your logo here

// Any route in this list (or starting with a prefix below) will HIDE the logo
const HIDE_EXACT = new Set([
  "/login",
  "/register",
  "/signin",
  "/signup",
  "/loginregister",
]);
const HIDE_PREFIX = ["/auth"]; // e.g. /auth/*

const shouldHide = (pathname) => {
  if (HIDE_EXACT.has(pathname)) return true;
  return HIDE_PREFIX.some((p) => pathname.startsWith(p));
};

export default function TopRightLogo() {
  const { pathname } = useLocation();
  if (shouldHide(pathname)) return null;

  return (
    <Link
      to="/menu" // optional: click logo goes to your home/menu; change if you want
      className="fixed top-3 right-3 z-50"
      aria-label="Neurocrest Home"
    >
      <img
        src={logo}
        alt="Neurocrest"
        className="h-10 w-auto md:h-12 drop-shadow-lg select-none"
        draggable={false}
      />
    </Link>
  );
}
