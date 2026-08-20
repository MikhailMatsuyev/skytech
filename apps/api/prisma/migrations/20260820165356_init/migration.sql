-- CreateEnum
CREATE TYPE "ScrapeSource" AS ENUM ('new_releases', 'browse_all');

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "coverUrl" TEXT,
    "developer" TEXT,
    "description" TEXT,
    "videoUrl" TEXT,
    "criticSummary" TEXT,
    "userSummary" TEXT,
    "summaryUpdatedAt" TIMESTAMP(3),
    "letsplayVideoUrl" TEXT,
    "letsplaySummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformScore" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "metascore" INTEGER,
    "userscore" INTEGER,

    CONSTRAINT "PlatformScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrapeState" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "workDate" DATE NOT NULL,
    "source" "ScrapeSource" NOT NULL,
    "nextPage" INTEGER NOT NULL DEFAULT 1,
    "processedToday" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScrapeState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyProcessedGame" (
    "id" TEXT NOT NULL,
    "workDate" DATE NOT NULL,
    "gameId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyProcessedGame_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Game_slug_key" ON "Game"("slug");

-- CreateIndex
CREATE INDEX "Game_title_idx" ON "Game"("title");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformScore_gameId_platform_key" ON "PlatformScore"("gameId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "DailyProcessedGame_workDate_gameId_key" ON "DailyProcessedGame"("workDate", "gameId");

-- AddForeignKey
ALTER TABLE "PlatformScore" ADD CONSTRAINT "PlatformScore_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyProcessedGame" ADD CONSTRAINT "DailyProcessedGame_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
