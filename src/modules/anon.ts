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
import { UserError, Command, ContextMenu, Modal, ConfigInitializer } from "bot-framework";
import { CubeGuildTextChannel, CubeModalBuilder } from "discord-wrappers";

export const config = ConfigInitializer.create<{
	channel: string,
}>('anon.json')

export const defaultAnonChannelCommand = new Command({
	name: 'Configurate Default Anonymous Message Channel',
	builder: new SlashCommandBuilder()
		.setName('config-anon')
		.setDescription('Configurate the /anon command')
		.setDMPermission(false)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.addChannelOption(option => option
			.setName('channel')
			.setDescription('The default anonymous messaging channel')
			.addChannelTypes(ChannelType.GuildText)
			.setRequired(true)),
	async run(interaction) {
		await interaction.deferEphemeral()
		const channel = await interaction.getTextChannelOption('channel', true)
		config.channel = channel.id
		return config.save()
	},
})

export const anonCommand = new Command({
	name: 'Anon',
	ephemeral: () => true,
	builder: new SlashCommandBuilder()
		.setName('anon')
		.setDescription('Send a message anonymously')
		.addChannelOption(option => option
			.setName('channel')
			.setDescription('The channel to send to')
			.addChannelTypes(ChannelType.GuildText))
		.addStringOption(option => option
			.setName('channel-name')
			.setDescription('The name of the channel to send to')
			.setAutocomplete(true))
		.addStringOption(option => option
			.setName('message')
			.setDescription('The message to send')
			.setRequired(true)),
	async run(interaction) {
		await interaction.deferEphemeral()
		let channel = await interaction.getTextChannelOption('channel')
		const channelName = interaction.options.getString('channel-name')

		if (channel && channelName) throw new UserError('Cannot specify channel and channel-name at the same time')
		if (!channel && !channelName) {
			if (interaction.channel?.isGuild()) channel = interaction.channel
			else channel = await bot.guild.findTextChannel({ id: config.channel })
		} else if (channelName) channel = await bot.guild.findTextChannel(channelName)
		if (!channel) throw new UserError('Could not find that channel!')

		const member = await interaction.fetchMember()
		if (!member) throw new UserError('Could not determine your permissions in the channel! Please try again')
		if (!member.permissionsIn(channel.id).has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]))
			throw new UserError('You do not have permission to send messages in that channel!')
		return channel.send(interaction.options.getString('message', true))
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
		await interaction.deferEphemeral()
		if (!interaction.channel) throw new UserError('Cannot send anonymous messages in this channel')
		const message = interaction.fields.getTextInputValue('message')
		if (!message) throw new UserError('Message cannot be empty!')
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