import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Supprime les blocs texte vides d'un tableau de messages Anthropic.
 * Corrige l'erreur "text content blocks must be non-empty".
 */
function filterEmptyTextBlocks(messages) {
  return messages
    .map(msg => {
      if (!Array.isArray(msg.content)) {
        // Contenu string simple : on le garde seulement s'il est non-vide
        if (typeof msg.content === 'string' && msg.content.trim() === '') return null;
        return msg;
      }
      const filtered = msg.content.filter(
        block => block.type !== 'text' || (block.text && block.text.trim().length > 0)
      );
      if (filtered.length === 0) return null;
      return { ...msg, content: filtered };
    })
    .filter(Boolean);
}

export default {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Génère un embed Discord avec l\'aide de Claude')
    .addStringOption(opt =>
      opt.setName('sujet').setDescription('Sujet de l\'embed').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('contexte').setDescription('Contexte supplémentaire (optionnel)').setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const sujet = interaction.options.getString('sujet');
    const contexte = interaction.options.getString('contexte') ?? '';

    const rawMessages = [
      {
        role: 'user',
        content: [
          { type: 'text', text: `Génère un titre court et une description pour un embed Discord sur : ${sujet}` },
          // Le contexte peut être vide si l'utilisateur ne le fournit pas
          { type: 'text', text: contexte },
        ],
      },
    ];

    // Filtre les blocs texte vides avant l'appel API
    const messages = filterEmptyTextBlocks(rawMessages);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      system: 'Tu génères du contenu pour des embeds Discord. Réponds en JSON avec les champs "title" et "description".',
      messages,
    });

    let title = sujet;
    let description = 'Aucune description générée.';
    try {
      const parsed = JSON.parse(response.content[0].text);
      title = parsed.title ?? title;
      description = parsed.description ?? description;
    } catch {
      description = response.content[0].text;
    }

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(0x5865f2)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
