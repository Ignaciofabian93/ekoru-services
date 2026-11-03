import { Module } from '@nestjs/common';
import { ServicesModule } from '../services/services.module.js';
import { BusinessServicesService } from './business-services.service.js';
import { BusinessServicesResolver } from './business-services.resolver.js';

/**
 * Business-facing publishing from the panel (ADM-16). Separate from
 * AdminServicesModule, which is EKORU's own whole-catalog tool: this one only
 * ever writes the caller's services, with the web's rules (ServicesService).
 */
@Module({
  imports: [ServicesModule],
  providers: [BusinessServicesService, BusinessServicesResolver],
})
export class BusinessServicesModule {}
