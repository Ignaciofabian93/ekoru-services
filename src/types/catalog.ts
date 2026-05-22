export type ServiceCatalog = {
  id: number;
  name: string;
  href: string;
  slug: string;
  subCategoryItems: {
    id: number;
    name: string;
    href: string;
    slug: string;
  }[];
}[];
