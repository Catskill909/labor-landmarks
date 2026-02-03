-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Landmark" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'USA',
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
INSERT INTO "new_Landmark" ("address", "category", "city", "createdAt", "description", "email", "id", "isPublished", "lat", "lng", "name", "state", "telephone", "updatedAt", "website") SELECT "address", "category", "city", "createdAt", "description", "email", "id", "isPublished", "lat", "lng", "name", "state", "telephone", "updatedAt", "website" FROM "Landmark";
DROP TABLE "Landmark";
ALTER TABLE "new_Landmark" RENAME TO "Landmark";
CREATE UNIQUE INDEX "Landmark_sourceUrl_key" ON "Landmark"("sourceUrl");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
