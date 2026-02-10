-- CreateTable
CREATE TABLE "LandmarkImage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "landmarkId" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LandmarkImage_landmarkId_fkey" FOREIGN KEY ("landmarkId") REFERENCES "Landmark" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Landmark" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "email" TEXT,
    "website" TEXT,
    "telephone" TEXT,
    "sourceUrl" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Landmark" ("address", "category", "city", "country", "createdAt", "description", "email", "id", "isPublished", "lat", "lng", "name", "sourceUrl", "state", "telephone", "updatedAt", "website") SELECT "address", "category", "city", "country", "createdAt", "description", "email", "id", "isPublished", "lat", "lng", "name", "sourceUrl", "state", "telephone", "updatedAt", "website" FROM "Landmark";
DROP TABLE "Landmark";
ALTER TABLE "new_Landmark" RENAME TO "Landmark";
CREATE UNIQUE INDEX "Landmark_sourceUrl_key" ON "Landmark"("sourceUrl");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
