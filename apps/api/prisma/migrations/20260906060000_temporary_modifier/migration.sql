-- Plan 13, ficha M8 (2026-09-06): modificadores temporales con caducidad.
--
-- «+2 a Fuerza durante una hora». Lo pidieron los jugadores por su nombre —«subidas y bajadas de
-- atributos temporales»— y no estaba escrito en ningun plan: era un hueco de alcance.
--
-- Tabla propia y NO `CharacterCondition`, aunque compartan la caducidad: una condicion es una regla
-- del SRD con nombre cerrado y esto es un numero arbitrario con un motivo escrito a mano.
--
-- `expiresAtClock` son segundos del RELOJ DE CAMPANA, no tiempo de pared, y es nulable: hay efectos
-- que duran «hasta que el DM lo diga».
CREATE TABLE "TemporaryModifier" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "expiresAtClock" INTEGER,
    "grantedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemporaryModifier_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TemporaryModifier_characterId_idx" ON "TemporaryModifier"("characterId");

ALTER TABLE "TemporaryModifier" ADD CONSTRAINT "TemporaryModifier_characterId_fkey"
    FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
