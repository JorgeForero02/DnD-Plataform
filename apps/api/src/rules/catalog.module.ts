import { Module } from "@nestjs/common";
import { CatalogController } from "./catalog.controller";

// Solo un controlador: el catálogo es una constante, no tiene estado ni servicio que valga la
// pena. Su módulo existe para poder cablearlo en `app.module.ts` como todo lo demás.
@Module({ controllers: [CatalogController] })
export class CatalogModule {}
