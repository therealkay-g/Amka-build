export type FileAttachment = {
  id: string;
  entity_type: string;
  entity_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string | null;
  uploaded_by: string | null;
  description: string | null;
  created_at: string;
};

export type FileTransfer = {
  id: string;
  file_attachment_id: string;
  sender_id: string;
  recipient_id: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
  file_attachments?: FileAttachment | null;
  sender?: { first_name: string; last_name: string } | null;
  recipient?: { first_name: string; last_name: string } | null;
};

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

export const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx", ".txt"];

export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
