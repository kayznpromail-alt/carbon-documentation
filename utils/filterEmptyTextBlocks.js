/**
 * Filtre les blocs texte vides d'un tableau de messages Anthropic.
 *
 * Corrige deux erreurs API :
 *   - "text content blocks must be non-empty"
 *   - "cache_control cannot be set for empty text blocks"
 *
 * Un bloc est considéré vide si block.text est absent, null, ou ne contient
 * que des espaces/sauts de ligne. Le bloc est supprimé en entier (cache_control inclus).
 *
 * @param {Array} messages  Tableau de messages au format Anthropic
 * @returns {Array}          Tableau nettoyé, sans blocs texte vides
 */
export function filterEmptyTextBlocks(messages) {
  return messages
    .map(msg => {
      // Contenu string simple
      if (typeof msg.content === 'string') {
        return msg.content.trim() === '' ? null : msg;
      }

      if (!Array.isArray(msg.content)) return msg;

      const filtered = msg.content.filter(block => {
        if (block.type !== 'text') return true;
        // Rejette le bloc si text est vide — peu importe si cache_control est présent
        return block.text != null && block.text.trim().length > 0;
      });

      // Si tous les blocs ont été supprimés, on retire le message entier
      if (filtered.length === 0) return null;

      return { ...msg, content: filtered };
    })
    .filter(Boolean);
}
