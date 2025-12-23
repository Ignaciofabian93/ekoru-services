import { Module } from "@nestjs/common";
import { ServiceCatalogService } from "./catalog.service.js";
import { ServiceCatalogResolver } from "./catalog.resolver.js";

@Module({
  providers: [ServiceCatalogService, ServiceCatalogResolver],
  exports: [ServiceCatalogService],
})
export class ServiceCatalogModule {}
