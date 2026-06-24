import DOMPurify from 'dompurify'

/**
 * Nettoie du HTML avant de l'injecter via v-html (prévention XSS).
 *
 * Utilisé pour les aperçus d'emails marketing : le HTML est saisi par le
 * commerçant et ne doit JAMAIS pouvoir exécuter de script (<script>, onerror,
 * javascript:, etc.) dans l'app.
 *
 * Notes :
 *  - DOMPurify a besoin du DOM (navigateur). Côté serveur (SSR) on renvoie une
 *    chaîne vide ; les pages marketing sont de toute façon en SPA (ssr:false).
 *  - On autorise `target` pour les liens (emails) mais on force rel=noopener
 *    via le hook ci-dessous pour éviter le tabnabbing.
 */
export function useSanitizeHtml() {
  const sanitize = (dirty: string | null | undefined): string => {
    if (!dirty) return ''
    if (!import.meta.client) return ''
    return DOMPurify.sanitize(dirty, {
      ADD_ATTR: ['target'],
      FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
    })
  }

  return { sanitize }
}
