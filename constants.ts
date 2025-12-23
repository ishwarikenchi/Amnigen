import { AnimationScript } from "./types";

export const SAMPLE_PROMPTS = [
  "Animate a circle expanding into a sphere.",
  "Visualize matrix multiplication step-by-step.",
  "Show the Earth orbiting the Sun in 3D.",
  "Explain Binary Search with sorting bars.",
  "Visualize the Water Cycle."
];

export const INITIAL_SCRIPT: AnimationScript = {
  title: "Welcome to AnimGen",
  description: "Enter a prompt to generate an educational animation.",
  canvas: { width: 800, height: 500, backgroundColor: "#1e293b" },
  objects: [
    { id: "c1", type: "sphere", x: 400, y: 250, z: 0, radius: 60, color: "#60a5fa", opacity: 1, scale: 1, rotationX: 15, rotationY: 15 },
    { id: "t1", type: "text", x: 400, y: 380, z: 0, text: "AnimGen Ready", fontSize: 24, color: "#ffffff", opacity: 1, scale: 1 }
  ],
  steps: [
    {
      id: "s1",
      description: "Welcome to AnimGen",
      duration: 1000,
      updates: [{ id: "c1", rotationY: 180, scale: 1.2 }]
    },
    {
      id: "s2",
      description: "Ready to generate",
      duration: 1000,
      updates: [{ id: "c1", rotationY: 360, scale: 1 }]
    }
  ]
};