-- apps/api/prisma/migrations/20260912120000_campaign_board_room_url/migration.sql
-- Pulido 2026-09-12 (C1 bis): la URL de la partida de PlanarAlly que la mesa enmarca.
-- Revertir: ALTER TABLE "Campaign" DROP COLUMN "boardRoomUrl";
ALTER TABLE "Campaign" ADD COLUMN "boardRoomUrl" TEXT;
