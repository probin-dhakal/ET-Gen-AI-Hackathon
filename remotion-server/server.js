import express from "express";
import cors from "cors";
import { execFile } from "child_process";
import path from "path";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/videos", express.static(path.join(process.cwd(), "out")));

app.post("/render", (req, res) => {
  const file = `out/video-${Date.now()}.mp4`;

  execFile(
  "npx",
  [
    "remotion",
    "render",
    "src/index.js",
    "MyVideo",
    file,
    "--props",
    JSON.stringify(req.body),
    "--duration",
    `${req.body.durationInFrames}`
  ],
    (err, stdout, stderr) => {
      console.log(stdout);
      console.log(stderr);

      if (err) {
        return res.status(500).json({ error: stderr });
      }

      res.json({
        videoUrl: `http://localhost:3001/videos/${file.split("/")[1]}`
      });
    }
  );
});

app.listen(3001, () => {
  console.log("🚀 Remotion server running");
});