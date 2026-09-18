-- CreateEnum
CREATE TYPE "CharacterSpellState" AS ENUM ('EN_EL_LIBRO', 'PREPARADO', 'CONOCIDO');

-- CreateTable
CREATE TABLE "CharacterSpell" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "spellKey" TEXT NOT NULL,
    "estado" "CharacterSpellState" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CharacterSpell_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CharacterSpell_characterId_spellKey_key" ON "CharacterSpell"("characterId", "spellKey");

-- AddForeignKey
ALTER TABLE "CharacterSpell" ADD CONSTRAINT "CharacterSpell_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
