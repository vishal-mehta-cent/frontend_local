import React from "react";
import BackButton from "./BackButton";

/**
 * HeaderBackRow — GLOBAL BACK BEHAVIOR
 *
 * ✅ Back always goes to previous page (navigate(-1))
 * ✅ Filters, tabs, and state are preserved
 * ✅ No hard-coded routes
 * ✅ Layout remains identical to Trade page
 */
export default function HeaderBackRow({ children, className = "" }) {
  return (
    <div className={`mt-1 grid grid-cols-[auto_1fr_auto] items-center ${className}`}>
      <div className="pl-5 pt-1">
        {/* Browser-style back navigation */}
        <BackButton inline />
      </div>

      <div className="justify-self-center">
        {children /* center icons / tabs / controls */}
      </div>

      <div /> {/* right spacer keeps center perfectly aligned */}
    </div>
  );
}
