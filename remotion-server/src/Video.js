import React from 'react';
import {
  AbsoluteFill,
  Html5Audio,
  staticFile,
  useCurrentFrame,
  Img,
  interpolate,
  useVideoConfig,
  spring,
} from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";

import logo from "./image.png"; // Your Overlay Logo
import et_img from "./et.jpeg"; // The intro image

const SceneComponent = ({ image, highlight, text, durationInFrames, isStatic = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Smooth Zoom Effect
  const scale = interpolate(frame, [0, durationInFrames], [1, 1.15]);

  // Entrance Animation for Text
  const springConfig = { stiffness: 100, damping: 12 };
  const textEntrance = spring({ frame, fps, config: springConfig });

  return (
    <AbsoluteFill>
      <Img
        src={isStatic ? et_img : staticFile(image)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale})`,
          filter: isStatic ? "none" : "brightness(0.5)", 
        }}
      />
      
      {!isStatic && (
        <div style={{
          position: "absolute",
          bottom: 120,
          left: 80,
          right: 80,
          opacity: textEntrance,
          transform: `translateY(${interpolate(textEntrance, [0, 1], [40, 0])}px)`,
          color: "white",
          fontFamily: "Helvetica, Arial, sans-serif"
        }}>
          <h2 style={{
            fontSize: 40,
            background: "#f5c518",
            color: "black",
            display: "inline-block",
            padding: "5px 15px",
            margin: 0,
            textTransform: "uppercase"
          }}>
            {highlight}
          </h2>
          <p style={{
            fontSize: 32,
            fontWeight: "bold",
            marginTop: 10,
            textShadow: "2px 2px 10px rgba(0,0,0,0.8)"
          }}>
            {text}
          </p>
        </div>
      )}
    </AbsoluteFill>
  );
};

export const MyVideo = ({ scenes, audio, durationInFrames }) => {
  const fps = 30;
  const transitionFrames = 15;
  
  // 1. Intro Logic: 2 seconds = 60 frames
  const introDuration = 60; 
  
  // 2. Remaining time for the news scenes
  const remainingFrames = durationInFrames - introDuration;
  const newsSceneDuration = Math.floor(remainingFrames / scenes.length);

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <TransitionSeries>
        {/* --- INTRO SCENE (2 SECONDS) --- */}
        <TransitionSeries.Sequence durationInFrames={introDuration + transitionFrames}>
          <SceneComponent 
            isStatic={true} 
            durationInFrames={introDuration} 
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: transitionFrames })}
        />

        {/* --- NEWS SCENES --- */}
        {scenes.map((scene, i) => (
          <React.Fragment key={i}>
            <TransitionSeries.Sequence durationInFrames={newsSceneDuration + transitionFrames}>
              <SceneComponent 
                image={scene.image} 
                highlight={scene.highlight} 
                text={scene.text}
                durationInFrames={newsSceneDuration} 
              />
            </TransitionSeries.Sequence>
            
            {/* Only add transition if it's not the last scene */}
            {i < scenes.length - 1 && (
              <TransitionSeries.Transition
                presentation={slide({ direction: "from-right" })}
                timing={linearTiming({ durationInFrames: transitionFrames })}
              />
            )}
          </React.Fragment>
        ))}
      </TransitionSeries>

      {/* Persistent Overlay Logo */}
      <Img src={logo} style={{ position: "absolute", top: 40, left: 40, width: 70 }} />

      <Html5Audio src={staticFile(audio)} />
    </AbsoluteFill>
  );
};