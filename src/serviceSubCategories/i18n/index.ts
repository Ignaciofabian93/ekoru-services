import { Injectable } from '@nestjs/common';
import { Language } from '@prisma/client';

type TranslationParams = Record<string, string>;

type TranslationMap = Record<string, Record<Language, string>>;

const TRANSLATIONS: TranslationMap = {
  'errors.service_sub_category_not_found': {
    [Language.ES]: "Subcategoría de servicio con slug '{slug}' no encontrada",
    [Language.EN]: "Service sub category with slug '{slug}' not found",
    [Language.FR]:
      "Sous-catégorie de service avec le slug '{slug}' introuvable",
    [Language.PT]: "Subcategoria de serviço com slug '{slug}' não encontrada",
    [Language.DE]: "Service-Unterkategorie mit Slug '{slug}' nicht gefunden",
  },
  'errors.service_sub_category_not_found_id': {
    [Language.ES]: "Subcategoría de servicio con id '{id}' no encontrada",
    [Language.EN]: "Service sub category with id '{id}' not found",
    [Language.FR]: "Sous-catégorie de service avec l'id '{id}' introuvable",
    [Language.PT]: "Subcategoria de serviço com id '{id}' não encontrada",
    [Language.DE]: "Service-Unterkategorie mit ID '{id}' nicht gefunden",
  },
  'errors.invalid_pagination': {
    [Language.ES]: 'Parámetros de paginación inválidos',
    [Language.EN]: 'Invalid pagination parameters',
    [Language.FR]: 'Paramètres de pagination invalides',
    [Language.PT]: 'Parâmetros de paginação inválidos',
    [Language.DE]: 'Ungültige Paginierungsparameter',
  },
  'errors.invalid_page': {
    [Language.ES]: 'La página debe ser mayor o igual a 1',
    [Language.EN]: 'Page must be greater than or equal to 1',
    [Language.FR]: 'La page doit être supérieure ou égale à 1',
    [Language.PT]: 'A página deve ser maior ou igual a 1',
    [Language.DE]: 'Die Seite muss größer oder gleich 1 sein',
  },
  'errors.page_size_out_of_range': {
    [Language.ES]: 'El tamaño de página debe estar entre {min} y {max}',
    [Language.EN]: 'Page size must be between {min} and {max}',
    [Language.FR]: 'La taille de page doit être comprise entre {min} et {max}',
    [Language.PT]: 'O tamanho da página deve estar entre {min} e {max}',
    [Language.DE]: 'Die Seitengröße muss zwischen {min} und {max} liegen',
  },
};

/**
 * I18N Service - Stateless language utilities for the serviceSubCategories subdomain
 *
 * Language for each request is stored in GraphQLContext.language (set at context
 * creation time from the Accept-Language header) and passed explicitly to services.
 * This service intentionally has NO mutable per-request state to avoid race conditions
 * in concurrent requests.
 */
@Injectable()
export class I18nServiceSubCategoryService {
  readonly DEFAULT_LANGUAGE = Language.ES;

  /**
   * Returns the default language used as fallback.
   */
  getDefaultLanguage(): Language {
    return this.DEFAULT_LANGUAGE;
  }

  /**
   * Translates a message key into the requested language, with optional interpolation.
   * Falls back to DEFAULT_LANGUAGE if the key is not found for the requested language.
   *
   * @example
   * translate('errors.service_sub_category_not_found', Language.EN, { slug: 'fotografia-bodas' })
   * // → "Service sub category with slug 'fotografia-bodas' not found"
   */
  translate(
    key: string,
    language: Language,
    params?: TranslationParams,
  ): string {
    const entry = TRANSLATIONS[key];
    let message = entry?.[language] ?? entry?.[this.DEFAULT_LANGUAGE] ?? key;

    if (params) {
      for (const [param, value] of Object.entries(params)) {
        message = message.replace(new RegExp(`\\{${param}\\}`, 'g'), value);
      }
    }

    return message;
  }
}
