import { authHeaders, fetchWithBaseUrlFallback } from "./authApi";

export interface TranscribeResponse {
  success: boolean;
  message: string;
  data: {
    text: string;
    languageCode: string;
  };
}

export async function transcribeAudioApi(
  base64Audio: string,
  format: "wav" | "amr"
): Promise<{ text: string; languageCode: string }> {
  const headers = await authHeaders();

  const res = await fetchWithBaseUrlFallback("/transcribe", {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      audio: base64Audio,
      format,
    }),
  });

  const raw = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      (raw as any)?.message ||
      (raw as any)?.error ||
      `Transcription failed (${res.status})`;
    throw new Error(message);
  }

  return raw.data;
}
