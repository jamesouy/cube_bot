// Send anonymous messages to channels

import { 
	ApplicationCommandType, 
	ChannelType, 
	ContextMenuCommandBuilder, 
	PermissionFlagsBits, 
	SlashCommandBuilder, 
	TextInputBuilder, 
	TextInputStyle 
} from "discord.js";
import { UserError, Command, ContextMenu, Modal } from "bot-framework";
import { CubeModalBuilder } from "discord-wrappers";

export const anonCommand = new Command({
	name: 'Anon',
	ephemeral: () => true,
	builder: new SlashCommandBuilder()
		.setName('anon')
		.setDescription('Send a message anonymously')
		.addChannelOption(option => option
			.setName('channel')
			.setDescription('The channel to send to (defaults to general)')
			.addChannelTypes(ChannelType.GuildText))
		.addStringOption(option => option
			.setName('channel-name')
			.setDescription('The name of the channel to send to (defaults to general)')
			.setAutocomplete(true))
		.addStringOption(option => option
			.setName('reply-to')
			.setDescription('The ID of the message to reply to'))
		.addStringOption(option => option
			.setName('message')
			.setDescription('The message to send')),
	async run(interaction) {
		let channel = await interaction.getTextChannelOption('channel')
		const channelName = interaction.options.getString('channel-name')
		if (channel && channelName) throw new UserError('Cannot specify channel and channel-name at the same time')
		if (channelName) {
			// interaction.guild?.find
			// interaction.guild?.channels.resolve()
		}
	},
})

export const anonModal = new Modal({
	ephemeral: true,
	builder: new CubeModalBuilder()
		.setCustomId('send-anonymous-message')
		.setTitle('Send Anonymous Message')
		.addTextInput(new TextInputBuilder()
			.setCustomId('message')
			.setLabel('Message')
			.setPlaceholder('Write your anonymous message...')
			.setStyle(TextInputStyle.Paragraph)
			.setRequired(true)
			.setMaxLength(200)),
	async run(interaction) {
		if (!interaction.channel) throw new UserError('Cannot send anonymous messages in this channel')
		const message = interaction.fields.getTextInputValue('message')
		if (!message) throw new UserError('Message cannot be empty!')
		await interaction.deferEphemeral()
		return interaction.channel.send(message)
	},
})

export const anonContextMenu = new ContextMenu({
	builder: new ContextMenuCommandBuilder()
		.setName('Message Anonymously')
		.setType(ApplicationCommandType.Message)
		.setDMPermission(false)
		.setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
	run(interaction) {
		return interaction.showModal(anonModal.builder)
	},
})

export const anonReplyContextMenu = new ContextMenu({
	builder: new ContextMenuCommandBuilder()
		.setName('Reply Anonymously')
		.setType(ApplicationCommandType.Message)
		.setDMPermission(false)
		.setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
	run(interaction) {
			// interaction
	},
})