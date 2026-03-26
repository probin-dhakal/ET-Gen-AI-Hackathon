import { Composition } from "remotion";
import { MyVideo } from "./Video.js";

export const RemotionRoot = () => {
  return (
    <Composition
      id="MyVideo"
      component={MyVideo}
      durationInFrames={10000} // dummy large
      fps={30}
      width={1280}
      height={720}
     defaultProps={{
      scenes: [],
      title: "",
      audio: "audio.mp3",
      durationInFrames: 300
    }}
    />
  );
};