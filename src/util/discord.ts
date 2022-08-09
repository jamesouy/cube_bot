////////////////////////////////////
/// discord.ts
/// Wrapper classes for discord.js
///////////////////////////////////

import { ActionRowBuilder, ModalActionRowComponentBuilder } from '@discordjs/builders'
import { 
	ChatInputCommandInteraction, 
	InteractionReplyOptions, 
	APIEmbed, 
	TextBasedChannel,
	GuildChannel,
	GuildBasedChannel,
	MessageOptions,
	Message,
	MessageEditOptions,
	ModalComponentData,
	APIModalInteractionResponseCallbackData,
	ModalBuilder,
	TextInputStyle,
	TextInputBuilder,
	TextInputComponentData,
	ComponentType,
	Interaction,
	ModalSubmitInteraction,
	AwaitModalSubmitOptions,
	ButtonInteraction,
	ButtonBuilder,
} from 'discord.js'
import { UserError } from '.'


type ReplyOptions = string | (Omit<InteractionReplyOptions, 'embeds'> & { embeds?: APIEmbed[] })
type SendOptions = string | (Omit<MessageOptions, 'embeds'> & { embeds?: APIEmbed[] })
type EditOptions = string | (Omit<MessageEditOptions, 'embeds'> & { embeds?: APIEmbed[] })

// Changes the default color of embeds
function setEmbedColor<T extends ReplyOptions | SendOptions | EditOptions>(options: T): T {
	if (typeof options !== 'string' && options.embeds)
		for (const i in options.embeds)
			options.embeds[i].color ??= 0x4CA8F7
	return options
}




// Since currently discord only supports action rows with a single text input,
// this makes modal building a lot simpler
export class CubeModalBuilder {
	readonly base: ModalBuilder
	constructor(readonly customId: string) {
		this.base = new ModalBuilder().setCustomId(customId)
	}
	get title() {
		return this.base.data.title
	}
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


// Wrapper classes for Interaction
export abstract class CubeBaseInteraction {
	constructor(readonly base: ChatInputCommandInteraction | ModalSubmitInteraction | ButtonInteraction) {}

	get replied() { return this.base.replied }
	get deferred() { return this.base.deferred }
	get channel() { return this.base.channel ? new CubeTextChannel(this.base.channel) : null }
	get guild() { return this.base.guild }
	get client() { return this.base.client }

	/** Reply or follow up */
	reply(options: ReplyOptions) {
		options = setEmbedColor(options)
		if (this.replied) return this.base.followUp(options)
		else return this.base.reply(options)
	}
	/** Reply or follow up privately */
	replyEphemeral(options: ReplyOptions) {
		if (typeof options === 'string') return this.reply({ content: options, ephemeral: true })
		else return this.reply({ ...options, ephemeral: true })
	}

	defer = () => this.base.deferReply({ fetchReply: true })
	deferEphemeral = () => this.base.deferReply({ ephemeral: true, fetchReply: true })

	editReply = (options: ReplyOptions) => this.base.editReply(options)

	replyError(err: unknown, ephemeral?: boolean) {
		if (err instanceof UserError)
			return this.reply({ 
				content: err.message, 
				ephemeral: err.ephemeral ?? ephemeral ?? false 
			})
		else {
			console.error(`Error on interaction`, this.base, err)
			return this.reply({ 
				content: 'Oh no! Error encountered :(', 
				ephemeral: ephemeral ?? false
			})
		}
	}
}
abstract class CubeNonModalInteraction extends CubeBaseInteraction {
	constructor(readonly base: ChatInputCommandInteraction | ButtonInteraction) { super(base) }

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
export class CubeChatInputCommandInteraction extends CubeNonModalInteraction {
	constructor(readonly base: ChatInputCommandInteraction) { super(base) }

	get commandName() { return this.base.commandName }
	get options() { return this.base.options }

	getChannelOption(name: string, required: true): Promise<GuildBasedChannel>
	getChannelOption(name: string, required?: boolean): Promise<GuildBasedChannel | null>
	/** Throws a user input error if the channel could not be found */
	async getChannelOption(name: string, required?: boolean): Promise<GuildBasedChannel | null> {
		let channel = this.options.getChannel(name, required)
		if (channel && !(channel instanceof GuildChannel)) {
			channel = await this.guild?.channels.fetch(channel.id) ?? null
			if (!channel) throw new UserError('Oops! Having trouble finding that channel. Please try again')
		}
		return channel
	}

	getTextChannelOption(name: string, required: true): Promise<CubeTextChannel>
	getTextChannelOption(name: string, required?: boolean): Promise<CubeTextChannel | null>
	async getTextChannelOption(name: string, required?: boolean) {
		const channel = await this.getChannelOption(name, required)
		if (!channel) return null
		if (!channel.isTextBased()) {
			if (required) throw new UserError('Channel is not text based!')
			else return null
		}
		return new CubeTextChannel(channel)
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


export class CubeMessage {
	constructor(readonly base: Message) {}

	edit(options: EditOptions) {
		return this.base.edit(setEmbedColor(options))
	}
}


export class CubeTextChannel {
	constructor(readonly base: TextBasedChannel) {}

	get id() { return this.base.id }

	send(options: SendOptions) {
		return this.base.send(setEmbedColor(options))
	}
}