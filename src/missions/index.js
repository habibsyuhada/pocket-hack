import m00 from './m00_kafe.js';
import m01 from './m01_blueprint.js';

export const MISSIONS = [m00, m01];
export const missionById = (id) => MISSIONS.find((m) => m.id === id);
