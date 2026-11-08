import type { Landmark } from './components/LandmarkCard';
import { landmarkPath } from '../server/landmark-link.ts';

export { landmarkPath, parseLandmarkRef } from '../server/landmark-link.ts';

/** The full shareable address of a landmark, on whatever site is serving it. */
export function landmarkUrl(landmark: Landmark): string {
  return `${window.location.origin}${landmarkPath(landmark)}`;
}
