import express from "express";
import cors from "cors";
import { exec } from "child_process";
import path from "path";

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

// Debug logger
app.use((req, res, next) => {
  console.log("Incoming:", req.method, req.url);
  next();
});

const PORT = 3001;

// Test route
app.get("/", (req, res) => {
  res.send("Server running");
});

app.get("/render", (req, res) => {
  res.send("Use POST for rendering");
});

// Serve videos
app.use("/videos", express.static(path.join(process.cwd(), "out")));

app.post("/render", (req, res) => {
  console.log("BODY:", req.body);

  const outputFile = `out/video-${Date.now()}.mp4`;

  const props = JSON.stringify(req.body).replace(/"/g, '\\"');

  const command = `
    npx remotion render src/index.js MyVideo ${outputFile} --props="${props}"
  `;

  exec(command, (error) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ error: "Render failed" });
    }

    res.json({
      video_url: `http://localhost:${PORT}/videos/${outputFile.split("/")[1]}`
    });
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});