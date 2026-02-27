// ===================== Speedometer.jsx (SMALLER VERSION) =====================
import React from "react";

export default function Speedometer({ value = 0, label = "" }) {
    const percent = Math.max(0, Math.min(100, value));

    // Needle rotation: -90deg (0%) → +90deg (100%)
    const rotation = (percent / 100) * 180 - 90;

    // Arc color
    const getColor = () => {
        if (percent <= 40) return "#E53935";   // Red
        if (percent <= 70) return "#FBC02D";   // Yellow
        return "#43A047";                      // Green
    };

    // --- NEW SMALLER DIMENSIONS ---
    const WIDTH = 140;
    const HEIGHT = 80;
    const CENTER_X = WIDTH / 2;
    const CENTER_Y = HEIGHT;
    const RADIUS = 65;

    return (
        <div
            style={{
                width: `${WIDTH}px`,
                height: `${HEIGHT + 20}px`,
                position: "relative",
                margin: "0 auto",
            }}
        >
            {/* ARC BACKGROUND */}
            <svg width={WIDTH} height={HEIGHT}>
                <path
                    d={`M${CENTER_X - RADIUS} ${CENTER_Y} 
                        A${RADIUS} ${RADIUS} 0 0 1 
                        ${CENTER_X + RADIUS} ${CENTER_Y}`}
                    stroke={getColor()}
                    strokeWidth="12"
                    fill="none"
                    strokeLinecap="round"
                />
            </svg>

            {/* NEEDLE */}
            <div
                style={{
                    position: "absolute",
                    top: `${CENTER_Y - 60}px`,
                    left: `${CENTER_X - 1}px`,
                    width: "2px",
                    height: "60px",  // shorter needle
                    background: "black",
                    transformOrigin: "bottom center",
                    transform: `rotate(${rotation}deg)`,
                }}
            />

            {/* VALUE TEXT */}
            <div
                style={{
                    position: "absolute",
                    top: `${CENTER_Y - 30}px`,
                    left: 0,
                    width: "100%",
                    textAlign: "center",
                    fontSize: "13px",
                    fontWeight: "700",
                }}
            >
                {percent.toFixed(1)}%
            </div>

            {/* LABEL BELOW */}
            {label && (
                <div
                    style={{
                        textAlign: "center",
                        marginTop: "4px",
                        fontSize: "12px",
                        fontWeight: "600",
                    }}
                >
                    {label}
                </div>
            )}
        </div>
    );
}
