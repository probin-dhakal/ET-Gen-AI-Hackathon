import { Composition } from "remotion";
import { MyVideo } from "./Video.js";

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="MyVideo"
        component={MyVideo}
        durationInFrames={180}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{
          title: "Demo Title",
          scenes: [{ text: "Hello world" }],
        }}
      />
    </>
  );
};