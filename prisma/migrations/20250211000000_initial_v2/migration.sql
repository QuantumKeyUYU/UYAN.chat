-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('PENDING', 'ANSWERED', 'BLOCKED', 'DELETED');

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "deviceHash" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "MessageStatus" NOT NULL DEFAULT 'PENDING',
    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Response" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "deviceHash" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isReported" BOOLEAN NOT NULL DEFAULT false,
    "seenAt" TIMESTAMP(3),
    CONSTRAINT "Response_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "messageId" TEXT,
    "responseId" TEXT,
    "deviceHash" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Message_deviceHash_idx" ON "Message"("deviceHash");

-- CreateIndex
CREATE INDEX "Response_messageId_idx" ON "Response"("messageId");
CREATE INDEX "Response_deviceHash_idx" ON "Response"("deviceHash");

-- CreateIndex
CREATE INDEX "Report_deviceHash_idx" ON "Report"("deviceHash");

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Report" ADD CONSTRAINT "Report_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "Response"("id") ON DELETE CASCADE ON UPDATE CASCADE;
