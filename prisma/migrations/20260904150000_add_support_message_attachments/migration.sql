CREATE TABLE "SupportMessageAttachment" (
  "id" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "storagePath" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SupportMessageAttachment_pkey"
    PRIMARY KEY ("id")
);

CREATE INDEX "SupportMessageAttachment_messageId_idx"
  ON "SupportMessageAttachment"("messageId");

ALTER TABLE "SupportMessageAttachment"
  ADD CONSTRAINT "SupportMessageAttachment_messageId_fkey"
  FOREIGN KEY ("messageId")
  REFERENCES "SupportMessage"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;