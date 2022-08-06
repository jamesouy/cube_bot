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
} from 'discord.js'

import { Awaitable } from './index'


type RespondOptions = string | (Omit<InteractionReplyOptions, 'embeds'> & { embeds?: APIEmbed[] })
type SendOptions = string | (Omit<MessageOptions, 'embeds'> & { embeds?: APIEmbed[] })
type EditOptions = string | (Omit<MessageEditOptions, 'embeds'> & { embeds?: APIEmbed[] })

// Changes the default color of embeds
function setEmbedColor<T extends RespondOptions | SendOptions | EditOptions>(options: T): T {
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
class CubeBaseInteraction {
	constructor(readonly base: ChatInputCommandInteraction | ModalSubmitInteraction) {}

	get replied() { return this.base.replied }
	get channel() { return this.base.channel ? new CubeTextChannel(this.base.channel) : null }
	get guild() { return this.base.guild }
	get client() { return this.base.client }

	// reply only if had not replied yet
	replyFirst(options: RespondOptions) {
		if (!this.replied) return this.reply(options)
	}

	// reply or follow up
	reply(options: RespondOptions) {
		options = setEmbedColor(options)
		if (this.replied) return this.base.followUp(options)
		else return this.base.reply(options)
	}

	replyEphemeral(options: RespondOptions) {
		if (typeof options === 'string') return this.reply({ content: options, ephemeral: true })
		else return this.reply({ ...options, ephemeral: true })
	}
}
export class CubeChatInputCommandInteraction extends CubeBaseInteraction {
	constructor(readonly base: ChatInputCommandInteraction) { super(base) }

	get commandName() { return this.base.commandName }
	get options() { return this.base.options }

	getChannelOption(name: string, required = false): Awaitable<GuildBasedChannel | null> {
		const channel = this.options.getChannel(name, required)
		if (!channel) return null
		if (!(channel instanceof GuildChannel)) return this.guild?.channels.fetch(channel.id) ?? null
		return channel
	}

	async showModal(modal: CubeModalBuilder, timeout = 300_000) {
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

	send(options: SendOptions) {
		return this.base.send(setEmbedColor(options))
	}
}