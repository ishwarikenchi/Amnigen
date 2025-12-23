// The core schema that the AI must generate
export interface AnimationScript {
  title: string;
  description: string;
  canvas: {
    width: number;
    height: number;
    backgroundColor: string;
  };
  // All objects that will appear in the animation
  objects: SceneObject[];
  // The sequence of animation steps
  steps: AnimationStep[];
}

export type SceneObjectType = 'circle' | 'rect' | 'text' | 'line' | 'latex' | 'plot' | 'arrow' | 'sphere' | 'cube' | 'grid';

export interface SceneObject {
  id: string;
  type: SceneObjectType;
  // Position
  x: number;
  y: number;
  z?: number; // Depth. 0 is screen plane. Positive is further away.
  
  // Dimensions
  width?: number; 
  height?: number; 
  depth?: number; // For 3D cubes
  radius?: number; 
  
  // Line coords
  x2?: number; 
  y2?: number; 
  z2?: number;

  // Content
  text?: string; 
  expression?: string; 
  domain?: [number, number]; 
  plotType?: 'cartesian' | 'polar'; 
  
  // Appearance
  scale?: number; 
  color: string;
  opacity: number;
  fontSize?: number;
  strokeWidth?: number;
  
  // Transforms
  rotation?: number; // Z-axis rotation (2D rotation)
  rotationX?: number; // 3D rotation
  rotationY?: number; // 3D rotation
}

export interface AnimationStep {
  id: string;
  description: string; // Displayed text description
  duration: number; // milliseconds
  // The state of objects at the END of this step.
  updates: (Partial<SceneObject> & { id: string })[];
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number; 
  totalDuration: number;
  currentStepIndex: number;
}