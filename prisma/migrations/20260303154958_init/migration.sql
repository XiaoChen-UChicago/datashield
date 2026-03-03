-- CreateTable
CREATE TABLE "DetectionEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "strategy" TEXT NOT NULL,
    "inputLength" INTEGER NOT NULL,
    "detectionCount" INTEGER NOT NULL,
    "elapsedMs" INTEGER NOT NULL,
    "report" JSONB NOT NULL
);

-- CreateTable
CREATE TABLE "TokenRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "originalHash" TEXT NOT NULL,
    "payload" BLOB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "TokenRecord_token_key" ON "TokenRecord"("token");

-- CreateIndex
CREATE UNIQUE INDEX "TokenRecord_originalHash_key" ON "TokenRecord"("originalHash");
