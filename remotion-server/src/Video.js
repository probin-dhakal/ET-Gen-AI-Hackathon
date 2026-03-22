import {
  AbsoluteFill,
  Html5Audio,
  staticFile,
  useCurrentFrame,
  Img,
  interpolate
} from "remotion";

import logo from "./image.png";

export const MyVideo = ({ scenes, title, audio, durationInFrames }) => {
  const frame = useCurrentFrame();

  const sceneDuration = durationInFrames / scenes.length;
  const index = Math.floor(frame / sceneDuration);
  const scene = scenes[index] || scenes[0];

  const localFrame = frame % sceneDuration;

  const opacity = interpolate(
    localFrame,
    [0, 20, sceneDuration - 20, sceneDuration],
    [0, 1, 1, 0]
  );

  const scale = interpolate(localFrame, [0, sceneDuration], [1, 1.15]);

  return (
    <AbsoluteFill style={{ color: "#fff", fontFamily: "Arial" }}>

      {/* Background */}
      <Img
        src={staticFile(scene.image)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale})`,
          filter: "brightness(0.4)"
        }}
      />

      {/* Audio */}
      <Html5Audio src={staticFile(audio)} />

      {/* Logo */}
      <Img src={logo} style={{ position: "absolute", top: 20, left: 20, width: 60 }} />

      {/* Content */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        textAlign: "center",
        width: "70%",
        opacity
      }}>
        <h1 style={{ fontSize: 50 }}>{title}</h1>

        <div style={{ color: "#f5c518", fontSize: 28 }}>
          {scene.highlight}
        </div>

        <p style={{ fontSize: 34 }}>{scene.text}</p>
      </div>
    </AbsoluteFill>
  );
};