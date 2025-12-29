
import { Gesture, Point } from '../types';
import { GESTURE_THRESHOLD } from '../constants';

/**
 * 计算两点之间的欧几里得距离
 */
const getDistance = (p1: any, p2: any) => {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
};

/**
 * 分析手部关键点以确定是拳头、张开的手还是未知手势
 */
export const analyzeGesture = (landmarks: any[]): Gesture => {
  if (!landmarks || landmarks.length < 21) return Gesture.UNKNOWN;

  // 关键地标点：
  // 0: 手腕
  // 4: 拇指尖
  // 8: 食指尖
  // 12: 中指尖
  // 16: 无名指尖
  // 20: 小指尖
  // 5, 9, 13, 17: MCP 关节（指关节）

  const wrist = landmarks[0];
  const fingertips = [landmarks[8], landmarks[12], landmarks[16], landmarks[20]];
  const knuckles = [landmarks[5], landmarks[9], landmarks[13], landmarks[17]];

  // 指尖到手腕的平均距离
  const tipDistances = fingertips.map(tip => getDistance(tip, wrist));
  const knuckleDistances = knuckles.map(knuckle => getDistance(knuckle, wrist));

  // 如果指尖比指关节更接近手腕，则可能是拳头
  // 实际上，更简单的方法：如果指尖非常接近其对应的 MCP 关节
  let bentFingers = 0;
  for (let i = 0; i < fingertips.length; i++) {
    if (getDistance(fingertips[i], knuckles[i]) < GESTURE_THRESHOLD) {
      bentFingers++;
    }
  }

  if (bentFingers >= 3) {
    return Gesture.FIST;
  }
  
  // 如果指尖远离手腕和指关节
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
