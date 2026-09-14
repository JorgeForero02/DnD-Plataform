-- Puerta de efectos §4.2 (2026-09-13): el daño de una salvación se tira UNA vez al usar la
-- actividad y se guarda aquí; cada objetivo aplica entero o mitad al responder.
-- Revertir:
--   ALTER TABLE "RollRequest" DROP COLUMN "pendingEffect";
ALTER TABLE "RollRequest" ADD COLUMN "pendingEffect" JSONB;
