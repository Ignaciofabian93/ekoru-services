import { ObjectType, Field } from '@nestjs/graphql';
import { Service } from './service.entity.js';
import { PageInfo } from '../../catalog-v2/entities/index.js';

@ObjectType()
export class ServiceConnection {
  @Field(() => [Service])
  nodes: Service[];

  @Field(() => PageInfo)
  pageInfo: PageInfo;
}
