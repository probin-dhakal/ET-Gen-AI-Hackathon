import { AbsoluteFill } from "remotion";

export const MyVideo = ({ title, scenes }) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "black",
        color: "white",
        justifyContent: "center",
        alignItems: "center",
        fontSize: 40,
        textAlign: "center",
        padding: 40,
      }}
    >
      <h1>{title}</h1>

      {scenes.map((scene, i) => (
        <p key={i}>{scene.text}</p>
      ))}
    </AbsoluteFill>
  );
};