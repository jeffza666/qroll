export type FaceScanResult = {
  descriptor: number[];
  livenessOk: boolean;
};

export type FaceScanMode = "verify" | "seed-from-file";

export type FaceErrorCode =
  | "camera_denied"
  | "no_face"
  | "multiple_faces"
  | "liveness_fail"
  | "liveness_timeout"
  | "face_mismatch"
  | "face_required"
  | "model_load_fail";
