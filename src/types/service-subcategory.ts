import { Language } from '@prisma/client';

export type ServiceSubCategory = {
  id: number;
  serviceCategoryId: number;
  isActive: boolean;
  sortOrder: number;
  featuredFrom: Date | null;
  featuredUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ServiceSubCategoryTranslation = {
  id: number;
  serviceSubCategoryId: number;
  language: Language;
  subCategory: string;
  slug: string;
  href: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string[];
  createdAt: Date;
  updatedAt: Date;
};
