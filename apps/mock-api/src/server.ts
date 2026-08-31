import express from "express";
import cors from "cors";

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// exact /api/v1/:path* rewrite simulator
app.all("/api/v1/*", (req, res) => {
  // Mock is production-fail-closed by default
  // Only explicitly whitelisted routes will respond.
  
  if (req.method === "GET" && req.path === "/api/v1/auth/session") {
    // Return unauthorized for now to simulate logged-out Wave A/B
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Fail closed
  return res.status(404).json({ error: "Not Found or Disabled in Mock" });
});

const PORT = 4100;
app.listen(PORT, () => {
  console.log(`Mock API running on http://localhost:${PORT}`);
});
