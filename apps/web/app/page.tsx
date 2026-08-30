import React from "react";

export default function HomePage() {
  return (
    <main
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "60px 24px",
        display: "flex",
        flexDirection: "column",
        gap: "48px",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          paddingBottom: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #00ff88 0%, #00b4d8 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              color: "#07090e",
              fontSize: "1.2rem",
            }}
          >
            S
          </div>
          <span
            style={{
              fontSize: "1.4rem",
              fontWeight: 800,
              letterSpacing: "-0.5px",
            }}
          >
            FindMySensi
          </span>
        </div>

        <nav style={{ display: "flex", gap: "24px", alignItems: "center" }}>
          <a
            href="/train/grid"
            style={{
              color: "#07090e",
              backgroundColor: "#00ff88",
              padding: "10px 20px",
              borderRadius: "6px",
              fontWeight: 700,
              textDecoration: "none",
              transition: "transform 0.1s ease",
            }}
          >
            Launch Trainer
          </a>
        </nav>
      </header>

      <section
        style={{
          textAlign: "center",
          padding: "60px 0 40px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px",
        }}
      >
        <div
          style={{
            display: "inline-block",
            padding: "6px 14px",
            borderRadius: "20px",
            backgroundColor: "rgba(0, 255, 136, 0.1)",
            border: "1px solid rgba(0, 255, 136, 0.3)",
            color: "#00ff88",
            fontSize: "0.85rem",
            fontWeight: 600,
            letterSpacing: "0.5px",
            textTransform: "uppercase",
          }}
        >
          Universal Aim & Sensitivity Engine
        </div>

        <h1
          style={{
            fontSize: "3.5rem",
            fontWeight: 900,
            lineHeight: 1.1,
            letterSpacing: "-1.5px",
            margin: 0,
            maxWidth: "800px",
            background: "linear-gradient(180deg, #ffffff 0%, #a0aec0 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Master Your Sensitivity Across Every Competitive FPS
        </h1>

        <p
          style={{
            fontSize: "1.2rem",
            color: "#94a3b8",
            maxWidth: "640px",
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          Deterministic 128 Hz simulation, unadjusted raw mouse input, and
          pixel-perfect sensitivity matching for Valorant, CS2, Apex Legends,
          and Overwatch 2.
        </p>

        <div style={{ display: "flex", gap: "16px", marginTop: "16px" }}>
          <a
            href="/train/grid"
            style={{
              backgroundColor: "#00ff88",
              color: "#07090e",
              padding: "14px 32px",
              borderRadius: "8px",
              fontWeight: 800,
              fontSize: "1.05rem",
              textDecoration: "none",
              boxShadow: "0 0 24px rgba(0, 255, 136, 0.4)",
            }}
          >
            Start Grid Practice
          </a>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "24px",
          marginTop: "20px",
        }}
      >
        <div
          style={{
            backgroundColor: "#0f1117",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "12px",
            padding: "28px",
          }}
        >
          <h3
            style={{
              fontSize: "1.25rem",
              margin: "0 0 10px 0",
              color: "#f8fafc",
            }}
          >
            Deterministic Fixed-Angle Math
          </h3>
          <p
            style={{
              color: "#94a3b8",
              fontSize: "0.95rem",
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            24-bit fixed-angle simulation ensures zero floating point drift and
            exact bit-level replay determinism across all platforms.
          </p>
        </div>

        <div
          style={{
            backgroundColor: "#0f1117",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "12px",
            padding: "28px",
          }}
        >
          <h3
            style={{
              fontSize: "1.25rem",
              margin: "0 0 10px 0",
              color: "#f8fafc",
            }}
          >
            High-Poll Raw Input (up to 8000 Hz)
          </h3>
          <p
            style={{
              color: "#94a3b8",
              fontSize: "0.95rem",
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            Preallocated typed-array ring buffers process modern gaming mouse
            polling rates with zero GC stutter and unadjusted movement.
          </p>
        </div>

        <div
          style={{
            backgroundColor: "#0f1117",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "12px",
            padding: "28px",
          }}
        >
          <h3
            style={{
              fontSize: "1.25rem",
              margin: "0 0 10px 0",
              color: "#f8fafc",
            }}
          >
            Potato Performance Mode
          </h3>
          <p
            style={{
              color: "#94a3b8",
              fontSize: "0.95rem",
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            Lightweight, high-framerate Canvas2D renderer with double-buffered
            atomic snapshots for maximum responsiveness.
          </p>
        </div>
      </section>
    </main>
  );
}
