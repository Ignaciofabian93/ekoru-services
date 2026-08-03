import { Module } from '@nestjs/common';
import { AdminServicesService } from './admin-services.service.js';
import { AdminServicesResolver } from './resolvers/index.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  providers: [AdminServicesService, AdminServicesResolver],
  exports: [AdminServicesService],
})
export class AdminServicesModule {}
