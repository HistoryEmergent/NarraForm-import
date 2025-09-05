export type ShotType = 
  | 'EXTREME_CLOSE_UP'
  | 'CLOSE_UP'
  | 'MEDIUM_CLOSE_UP'
  | 'MEDIUM_SHOT'
  | 'MEDIUM_WIDE_SHOT'
  | 'WIDE_SHOT'
  | 'EXTREME_WIDE_SHOT';

export type CameraMovement = 
  | 'STATIC'
  | 'PAN'
  | 'TILT'
  | 'DOLLY'
  | 'ZOOM'
  | 'CRANE'
  | 'HANDHELD'
  | 'STEADICAM';

export type SourceType = 'original' | 'processed';

export interface TextSelection {
  text: string;
  startPosition: number;
  endPosition: number;
  sourceType: SourceType;
}

export interface Shot {
  id: string;
  chapterId: string;
  projectId: string;
  shotOrder: number;
  shotType: ShotType;
  cameraMovement?: CameraMovement;
  cameraMovementDescription?: string;
  sourceText: string;
  sourceType: SourceType;
  startPosition: number;
  endPosition: number;
  generatedDescription?: string;
  userDescription?: string;
  createdAt: string;
  updatedAt: string;
}

export const shotTypeLabels: Record<ShotType, string> = {
  'EXTREME_CLOSE_UP': 'Extreme Close-Up',
  'CLOSE_UP': 'Close-Up',
  'MEDIUM_CLOSE_UP': 'Medium Close-Up',
  'MEDIUM_SHOT': 'Medium Shot',
  'MEDIUM_WIDE_SHOT': 'Medium Wide Shot',
  'WIDE_SHOT': 'Wide Shot',
  'EXTREME_WIDE_SHOT': 'Extreme Wide Shot'
};

export const cameraMovementLabels: Record<CameraMovement, string> = {
  'STATIC': 'Static',
  'PAN': 'Pan',
  'TILT': 'Tilt',
  'DOLLY': 'Dolly',
  'ZOOM': 'Zoom',
  'CRANE': 'Crane',
  'HANDHELD': 'Handheld',
  'STEADICAM': 'Steadicam'
};