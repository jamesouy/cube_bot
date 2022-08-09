import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, SlashCommandBuilder, SlashCommandSubcommandBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { Command, Button, Modal } from "../bot-framework/interactions";
import { CubeModalBuilder } from "../util/discord";

export const anonymousSuggestionModal = new Modal({
	builder: new CubeModalBuilder('anonymous-suggestion')
		.setTitle('Send Anonymous Suggestion')
		.addTextInput(new TextInputBuilder()
			.setCustomId('suggestion')
			.setLabel('Suggestion')
			.setPlaceholder('Suggestion an event, channel, bot, emoji, etc...')
			.setStyle(TextInputStyle.Paragraph)
			.setRequired(true)),
	async run(interaction) {
		const suggestion = interaction.fields.getTextInputValue('suggestion')
		await interaction.deferEphemeral()
		
		await interaction.channel?.send({ embeds: [{
			title: 'New Anonymous Suggestion',
			description: suggestion,
			footer: {
				text: `Send your own anonymous suggestion by going to the pinned message!`
			}
		}]})
	},
})

export const anonymousSuggestionButton = new Button({
	builder: new ButtonBuilder()
		.setCustomId('anonymous-suggestion')
		.setLabel('Suggest Anonymously')
		.setStyle(ButtonStyle.Primary),
	run(interaction) {
		return interaction.showModal(anonymousSuggestionModal.builder)
	},
})

export const suggestionsChannelCommand = new Command({
	builder: new SlashCommandBuilder()
		.setName('set-suggestions-channel')
		.setDescription('Sets the suggestions channel and posts a button for anonymous suggestions')
		.setDMPermission(false)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.addChannelOption(option => option
			.setName('channel')
			.setDescription('The suggestions channel')
			.setRequired(true)
			.addChannelTypes(ChannelType.GuildText)),
	async run(interaction) {
		await interaction.defer()
		const channel = await interaction.getTextChannelOption('channel', true)
		await channel.send({
			embeds: [{
				description: 'Click on the button under this message to send a suggestion anonymously!'
			}],
			components: [new ActionRowBuilder<ButtonBuilder>()
				.addComponents(anonymousSuggestionButton.builder)]
		})
	},
})