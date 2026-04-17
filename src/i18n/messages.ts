import { Language } from '@prisma/client';

type TranslationMap = Record<string, string>;

export const translations: Partial<Record<Language, TranslationMap>> = {
  [Language.ES]: {
    'errors.service_category_not_found':
      "Categoría de servicio con slug '{{slug}}' no encontrada",
    'errors.service_category_id_not_found':
      "Categoría de servicio con ID '{{id}}' no encontrada",
    'errors.service_subcategory_not_found':
      "Subcategoría de servicio con slug '{{slug}}' no encontrada",
    'errors.limit_out_of_range': 'El límite debe estar entre {{min}} y {{max}}',
    'errors.offset_negative': 'El offset no puede ser negativo',
  },
  [Language.EN]: {
    'errors.service_category_not_found':
      "Service category with slug '{{slug}}' not found",
    'errors.service_category_id_not_found':
      "Service category with ID '{{id}}' not found",
    'errors.service_subcategory_not_found':
      "Service sub-category with slug '{{slug}}' not found",
    'errors.limit_out_of_range': 'Limit must be between {{min}} and {{max}}',
    'errors.offset_negative': 'Offset must be non-negative',
  },
};
