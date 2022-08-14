//////////////////////////////////////
/// interactions.ts
/// Wrapper classes for Interaction
/////////////////////////////////////
import { 
	ChatInputCommandInteraction, 
	InteractionReplyOptions, 
	APIEmbed, 
	GuildChannel,
	GuildBasedChannel,
	ModalSubmitInteraction,
	ButtonInteraction,
	ContextMenuCommandInteraction,
	APIInteractionDataResolvedChannel,
	Guild,
	GuildMember,
	APIInteractionGuildMember,
	ModalBuilder,
	TextInputStyle,
	TextInputBuilder,
	TextInputComponentData,
	ComponentType,
	ActionRowBuilder,
	ModalActionRowComponentBuilder,
	ThreadChannel,
	Interaction,
	CommandInteraction,
} from 'discord.js'
import { UserError } from 'bot-framework'
import { CubeGuild, CubeGuildChannel, CubeMessage, CubeTextChannel, setEmbedColor } from '.'
import { createCubeGuildChannel, createCubeTextChannel, CubeGuildTextChannel } from './channels'

export type ReplyOptions = string | (Omit<InteractionReplyOptions, 'embeds'> & { embeds?: APIEmbed[] })




// Since currently discord only supports action rows with a single text input,
// this makes modal building a lot simpler
export class CubeModalBuilder {
	readonly base: ModalBuilder
	constructor() {
		this.base = new ModalBuilder()
		// this.base = new ModalBuilder().setCustomId(customId)
	}

	get title() { return this.base.data.title }
	get customId() { return this.base.data.custom_id }
	get textInputData() {
		return this.base.components.map(row => {
			const textInput = row.components[0].data
			textInput.type ??= ComponentType.TextInput
			textInput.custom_id ??= ''
			textInput.label ??= ''
			textInput.style ??= TextInputStyle.Short
			return textInput
		}) as TextInputComponentData[]
	}
	setCustomId(customId: string) {
		this.base.setCustomId(customId)
		return this
	}
	setTitle(title?: string) {
		if (title) this.base.setTitle(title)
		return this
	}
	addTextInput(textInput: TextInputBuilder) {
		this.base.addComponents(
			new ActionRowBuilder<ModalActionRowComponentBuilder>()
				.setComponents(textInput))
		return this
	}
}

// async function resolveGuildMember(
// 	member: APIInteractionGuildMember | GuildMember | null, guild: Guild | null
// ): Promise<GuildMember | null> {
// 	if (member && !(member instanceof GuildMember)) {
// 		member = await guild?.members.fetch(member.user.id) ?? null
// 		if (!member) throw new UserError('Oops! Having trouble finding that channel. Please try again')
// 	}
// 	return member
// }


export abstract class CubeBaseInteraction {
	constructor(readonly base: 
		ChatInputCommandInteraction | ContextMenuCommandInteraction | 
		ModalSubmitInteraction | ButtonInteraction
	) {}

	get replied() { return this.base.replied }
	get deferred() { return this.base.deferred }
	get channel() { return createCubeTextChannel(this.base.channel) }
	get client() { return this.base.client }

	fetchMember = async () => this.base.member instanceof GuildMember ? 
		this.base.member : await bot.guild.findMember(this.base.member)

	/** Reply, follow up, or edit deferred */
	reply(options: ReplyOptions) {
		options = setEmbedColor(options)
		if (this.deferred) return this.base.editReply(options)
		if (this.replied) return this.base.followUp(options)
		else return this.base.reply(options)
	}
	/** Reply or follow up privately */
	replyEphemeral(options: ReplyOptions) {
		options = setEmbedColor(options)
		if (typeof options === 'string') return this.reply({ content: options, ephemeral: true })
		else return this.reply({ ...options, ephemeral: true })
	}

	defer = () => this.base.deferReply()
	deferEphemeral = () => this.base.deferReply({ ephemeral: true, fetchReply: true })

	editReply = (options: ReplyOptions) => this.base.editReply(options)

	deleteReply = () => this.base.deleteReply()
}

abstract class CubeNonModalInteraction extends CubeBaseInteraction {
	constructor(readonly base: ChatInputCommandInteraction | ButtonInteraction | 
		ContextMenuCommandInteraction) { super(base) }

	showModal = (modal: CubeModalBuilder) => this.base.showModal(modal.base)

	async awaitModal(modal: CubeModalBuilder, timeout = 300_000) {
		await this.base.showModal(modal.base)
		const interaction = await this.base.awaitModalSubmit({
			filter: interaction => interaction.customId === modal.customId
				 && interaction.user.id === this.base.user.id,
			time: timeout
		}).catch(async err => {
			await this.replyEphemeral('Modal timed out!')
			return null
		})
		if (!interaction) return null
		return new CubeModalSubmitInteraction(interaction)
	}
}

export class CubeCommandInteraction extends CubeNonModalInteraction {
	constructor(readonly base: ChatInputCommandInteraction) { super(base) }

	get commandName() { return this.base.commandName }
	get options() { return this.base.options }

	getChannelOption(name: string, required: true): Promise<CubeGuildChannel>
	getChannelOption(name: string, required?: boolean): Promise<CubeGuildChannel | null>
	/** Throws a user input error if the channel could not be found */
	async getChannelOption(name: string, required?: boolean): Promise<CubeGuildChannel | null> {
		const channel = this.options.getChannel(name, required)
		if (channel instanceof GuildChannel || channel instanceof ThreadChannel) return createCubeGuildChannel(channel)
		const ch = await bot.guild.findChannel(channel)
		if (!ch && required) throw new UserError('Oops! Having trouble finding that channel. Please try again')
		return ch ?? null
	}

	getTextChannelOption(name: string, required: true): Promise<CubeGuildTextChannel>
	getTextChannelOption(name: string, required?: boolean): Promise<CubeGuildTextChannel | null>
	async getTextChannelOption(name: string, required?: boolean) {
		const channel = await this.getChannelOption(name, required)
		if (!channel || !channel.isText()) {
			if (required) throw new UserError('Channel is not text based!')
			else return null
		}
		return channel
	}
}

export class CubeContextMenuInteraction extends CubeNonModalInteraction {
	constructor(readonly base: ContextMenuCommandInteraction) { super(base) }
	get commandName() { return this.base.commandName }
	get targetId() { return this.base.targetId }
	get targetUser() { 
		if (this.base.isUserContextMenuCommand()) return this.base.targetUser 
		else throw new Error(`Context menu is not a user context menu ${this.base}`)
	}
	getTargetMember() { // TODO: make findMember method in CubeGuild
		if (this.base.isUserContextMenuCommand()) return bot.guild.findMember(this.base.targetMember)
		else throw new Error(`Context menu is not a user context menu ${this.base}`)
	}
	get targetMessage() {
		if (this.base.isMessageContextMenuCommand()) return new CubeMessage(this.base.targetMessage)
		else throw new Error(`Context menu is not a message context menu ${this.base}`)
	}
}

export class CubeButtonInteraction extends CubeNonModalInteraction {
	constructor(readonly base: ButtonInteraction) { super(base) }
	get customId() { return this.base.customId }
}

export class CubeModalSubmitInteraction extends CubeBaseInteraction {
	constructor(readonly base: ModalSubmitInteraction) { super(base) }
	get customId() { return this.base.customId }
	get fields() { return this.base.fields }
}