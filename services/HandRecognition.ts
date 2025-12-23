
import { Gesture, Point } from '../types';
import { GESTURE_THRESHOLD } from '../constants';

/**
 * Calculates Euclidean distance between two points
 */
const getDistance = (p1: any, p2: any) => {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
};

/**
 * Analyzes hand landmarks to determine if it's a fist, open hand, or unknown
 */
export const analyzeGesture = (landmarks: any[]): Gesture => {
  if (!landmarks || landmarks.length < 21) return Gesture.UNKNOWN;

  // Key landmarks:
  // 0: Wrist
  // 4: Thumb Tip
  // 8: Index Finger Tip
  // 12: Middle Finger Tip
  // 16: Ring Finger Tip
  // 20: Pinky Tip
  // 5, 9, 13, 17: MCP joints (knuckles)

  const wrist = landmarks[0];
  const fingertips = [landmarks[8], landmarks[12], landmarks[16], landmarks[20]];
  const knuckles = [landmarks[5], landmarks[9], landmarks[13], landmarks[17]];

  // Average distance from fingertips to wrist
  const tipDistances = fingertips.map(tip => getDistance(tip, wrist));
  const knuckleDistances = knuckles.map(knuckle => getDistance(knuckle, wrist));

  // If tips are closer to the wrist than knuckles are, it's likely a fist
  // Actually, a simpler way: if tips are very close to their corresponding MCP joints
  let bentFingers = 0;
  for (let i = 0; i < fingertips.length; i++) {
    if (getDistance(fingertips[i], knuckles[i]) < GESTURE_THRESHOLD) {
      bentFingers++;
    }
  }

  if (bentFingers >= 3) {
    return Gesture.FIST;
  }
  
  // If tips are far from the wrist and knuckles
  let extendedFingers = 0;
  for (let i = 0; i < fingertips.length; i++) {
    if (getDistance(fingertips[i], knuckles[i]) > GESTURE_THRESHOLD * 1.5) {
      extendedFingers++;
    }
  }

  if (extendedFingers >= 3) {
    return Gesture.OPEN;
  }

  return Gesture.UNKNOWN;
};
