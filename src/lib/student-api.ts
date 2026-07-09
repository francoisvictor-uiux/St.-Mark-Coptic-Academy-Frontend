/** Typed client for the student self-service profile APIs (spec AUTH-09). */

import { authedRequest } from "./api";

export type StudentDocument = {
  id: string;
  url: string;
  original_name: string;
  mime: string;
  size_bytes: number;
  verified_at: string | null;
  created_at: string;
};

export type StudentProfile = {
  photo_url: string;
  gender: "" | "male" | "female";
  date_of_birth: string | null;
  nationality_code: string;
  education_level: "" | "secondary" | "bachelor" | "master" | "doctorate" | "other";
  education_field: string;
  church_service: string;
  confession_father: string;
  bio: string;
  emergency_name: string;
  emergency_relation: string;
  emergency_phone: string;
  completion_pct: number;
  country_code: string;
  church_other_text: string;
  diocese_name: string;
  church_name: string;
  program_name: string;
  documents: StudentDocument[];
};

export type ProfilePatch = Partial<
  Omit<StudentProfile, "photo_url" | "completion_pct" | "documents" | "diocese_name" | "church_name" | "program_name" | "country_code" | "church_other_text">
>;

export function getMyProfile() {
  return authedRequest<StudentProfile>("/students/me/profile");
}

export function patchMyProfile(payload: ProfilePatch) {
  return authedRequest<StudentProfile>("/students/me/profile", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function uploadMyPhoto(file: File) {
  const form = new FormData();
  form.append("file", file);
  return authedRequest<StudentProfile>("/students/me/photo", { method: "POST", body: form });
}

export function deleteMyPhoto() {
  return authedRequest<StudentProfile>("/students/me/photo", { method: "DELETE" });
}

export function uploadMyDocument(file: File) {
  const form = new FormData();
  form.append("file", file);
  return authedRequest<StudentProfile>("/students/me/documents", { method: "POST", body: form });
}

export function deleteMyDocument(id: string) {
  return authedRequest<void>(`/students/me/documents/${id}`, { method: "DELETE" });
}
