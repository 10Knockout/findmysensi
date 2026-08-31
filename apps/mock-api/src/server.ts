import express from "express";
import cors from "cors";

const app = express();

const allowedOrigins = ["http://localhost:3000", "http://127.0.0.1:3000"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS not allowed"));
      }
    },
    credentials: true,
  }),
);

app.use(express.json());

// Health check
app.get(["/health", "/api/v1/health"], (_req, res) => {
  res.json({ status: "ok", service: "findmysensi-mock-api" });
});

// Mock session check
app.get(["/api/auth/get-session", "/api/v1/auth/session"], (_req, res) => {
  // Return null session for unauthenticated baseline
  res.json({ user: null, session: null });
});

// Handshake A mock
app.post("/api/v1/handshake-a", (req, res) => {
  const { scenario } = req.body || {};
  res.json({
    ticketId: "00000000-0000-4000-8000-000000000001",
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    claims: {
      scenarioId: scenario || "grid",
    },
    signature: "fms_mock_ticket_signature",
  });
});

// Fallback fail-closed
app.all("/api/v1/*", (_req, res) => {
  res.status(404).json({ error: "Not Found or Disabled in Mock" });
});

const PORT = 4100;
app.listen(PORT, "127.0.0.1", () => {
  console.log(`Mock API running on http://127.0.0.1:${PORT}`);
});
