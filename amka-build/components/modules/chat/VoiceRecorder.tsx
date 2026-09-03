import React, { useState, useRef } from "react";
import { Mic, Square } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface VoiceRecorderProps {
  onRecordingStarted: () => void;
  onRecordingStopped: (blob: Blob) => void;
  onMessageSent: (content: string, url: string) => void;
}

export function VoiceRecorder({ onRecordingStarted, onRecordingStopped, onMessageSent }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        onRecordingStopped(audioBlob);

        // Upload to Supabase Storage
        const userId = (await supabase.auth.getUser()).data.user?.id;
        if (!userId) return;

        const fileName = `vocals/${userId}/${Date.now()}.webm`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("media")
          .upload(fileName, audioBlob);

        if (uploadError) {
          console.error("Error uploading vocal:", uploadError);
          return;
        }

        const { data: { publicUrl } } = supabase.storage.from("media").getPublicUrl(uploadData.path);

        // Notify parent to send message
        onMessageSent("Message vocal", publicUrl);
      };

      mediaRecorder.start();
      setIsRecording(true);
      onRecordingStarted();
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Impossible d'accéder au microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  return (
    <button
      onMouseDown={isRecording ? stopRecording : startRecording}
      onMouseUp={isRecording ? stopRecording : undefined}
      className={`p-2 rounded-full transition-all ${
        isRecording
          ? "bg-error text-white scale-110 animate-pulse"
          : "text-muted hover:bg-surface-mid hover:text-primary"
      }`}
      title={isRecording ? "Relâcher pour envoyer" : "Maintenir pour enregistrer un vocal"}
    >
      {isRecording ? <Square size={20} fill="currentColor" /> : <Mic size={20} />}
    </button>
  );
}
