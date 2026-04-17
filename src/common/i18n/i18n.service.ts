import { Injectable } from '@nestjs/common';
import { Language } from '@prisma/client';
import { translations } from '../../i18n/messages.js';

/**
 * I18N Service - Manages language context for multi-language support
 *
 * Extracts and resolves language from Accept-Language headers.
 * Falls back to DEFAULT_LANGUAGE (ES) when no match is found.
 */
@Injectable()
export class I18nService {
  readonly DEFAULT_LANGUAGE = Language.ES;

  /**
   * Parses Accept-Language header and returns the best matching Language
   *
   * @example
   * parseAcceptLanguage('en-US,en;q=0.9,es;q=0.8') // Language.EN
   * parseAcceptLanguage('fr-FR') // Language.FR
   * parseAcceptLanguage('xx-XX') // Language.ES (default)
   */
  parseAcceptLanguage(acceptLanguageHeader: string | undefined): Language {
    if (!acceptLanguageHeader) {
      return this.DEFAULT_LANGUAGE;
    }

    const languages = acceptLanguageHeader
      .split(',')
      .map((lang) => {
        const [code, qStr] = lang.trim().split(';');
        const q = qStr ? parseFloat(qStr.split('=')[1]) : 1.0;
        return { code: code.split('-')[0].toUpperCase(), q };
      })
      .sort((a, b) => b.q - a.q);

    for (const { code } of languages) {
      if (Object.values(Language).includes(code as Language)) {
        return code as Language;
      }
    }

    return this.DEFAULT_LANGUAGE;
  }

  getDefaultLanguage(): Language {
    return this.DEFAULT_LANGUAGE;
  }

  /**
   * Translates a message key to the requested language.
   * Falls back to DEFAULT_LANGUAGE if the key is not found in the requested language.
   * Returns the key itself if not found in any language.
   *
   * Supports {{param}} interpolation in message strings.
   *
   * @param {string} key - Dot-notation message key (e.g. 'errors.not_found')
   * @param {Language} language - Target language
   * @param {Record<string, string>} [params] - Optional interpolation params
   * @returns {string} Translated and interpolated message
   */
  translate(
    key: string,
    language: Language,
    params?: Record<string, string>,
  ): string {
    const lang = language ?? this.DEFAULT_LANGUAGE;
    const map = translations[lang] ?? translations[this.DEFAULT_LANGUAGE];
    let message = map?.[key];

    if (!message && lang !== this.DEFAULT_LANGUAGE) {
      message = translations[this.DEFAULT_LANGUAGE]?.[key];
    }

    if (!message) return key;

    if (params) {
      message = Object.entries(params).reduce(
        (msg, [k, v]) => msg.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v),
        message,
      );
    }

    return message;
  }
}
