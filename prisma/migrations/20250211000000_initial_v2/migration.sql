-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('PENDING', 'PUBLISHED', 'BLOCKED');

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "deviceHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'PUBLISHED',
    "hasResponse" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Response" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "authorDeviceId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Response_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserStats" (
    "deviceId" TEXT NOT NULL,
    "messagesSent" INTEGER NOT NULL DEFAULT 0,
    "responsesSent" INTEGER NOT NULL DEFAULT 0,
    "responsesReceived" INTEGER NOT NULL DEFAULT 0,
    "lastResponseReceivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserStats_pkey" PRIMARY KEY ("deviceId")
);

-- CreateTable
CREATE TABLE "GlobalStats" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "messagesTotal" INTEGER NOT NULL DEFAULT 0,
    "responsesTotal" INTEGER NOT NULL DEFAULT 0,
    "devicesTotal" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "GlobalStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Device_deviceHash_key" ON "Device"("deviceHash");

-- CreateIndex
CREATE UNIQUE INDEX "Response_messageId_key" ON "Response"("messageId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_authorDeviceId_fkey" FOREIGN KEY ("authorDeviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStats" ADD CONSTRAINT "UserStats_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
