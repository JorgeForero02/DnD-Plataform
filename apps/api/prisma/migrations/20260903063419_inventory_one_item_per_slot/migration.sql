-- Una ranura, un objeto. Garantizado por la base y no por el servicio (hueco H1).
--
-- Prisma no sabe expresar un indice unico PARCIAL en el esquema, asi que va aqui a mano: la
-- restriccion solo aplica a las filas equipadas y con ranura; una mochila puede llevar tres
-- anillos sin ranura sin que eso sea un error.
--
-- Motivo de que lo garantice la base: dos peticiones simultaneas de «equipar» pasan las dos por
-- el `if` del servicio y escriben las dos. Con esto, la segunda choca y el servicio la traduce a
-- un 409. Como el Prisma simulado de las unitarias no valida SQL, la prueba de esto es e2e
-- contra Postgres real (docs/08-pruebas.md).
CREATE UNIQUE INDEX "inventory_one_item_per_slot"
  ON "InventoryItem" ("characterId", "slot")
  WHERE "slot" IS NOT NULL AND "location" = 'EQUIPPED';
