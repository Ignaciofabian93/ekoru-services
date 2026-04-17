import { Language } from '@prisma/client';

export type ServiceCategory = {
  id: number;
  isActive: boolean;
  sortOrder: number;
  featuredFrom: Date | null;
  featuredUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ServiceCategoryTranslation = {
  id: number;
  serviceCategoryId: number;
  language: Language;
  category: string;
  slug: string;
  href: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string[];
  createdAt: Date;
  updatedAt: Date;
};
