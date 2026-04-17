import { ObjectType, Field } from '@nestjs/graphql';
import { Quotation } from './quotation.entity.js';
import { PageInfo } from '../../catalog-v2/entities/index.js';

@ObjectType()
export class QuotationConnection {
  @Field(() => [Quotation])
  nodes: Quotation[];

  @Field(() => PageInfo)
  pageInfo: PageInfo;
}
