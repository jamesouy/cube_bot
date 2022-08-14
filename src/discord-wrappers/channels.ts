import { 
	APIEmbed, 
	TextBasedChannel,
	MessageOptions,
	GuildTextBasedChannel,
	GuildBasedChannel,
  NewsChannel,
  TextChannel,
  PublicThreadChannel,
  PrivateThreadChannel,
  GuildChannel,
  CategoryChannel,
  VoiceChannel,
  Channel,
  DMChannel,
  PartialDMChannel,
  PartialGroupDMChannel,
  StageChannel,
} from 'discord.js'
import { CubeMessage, setEmbedColor } from 'discord-wrappers'
import { CubeGuild } from './guild'


export type SendOptions = string | (Omit<MessageOptions, 'embeds'> & { embeds?: APIEmbed[] })


/////////////////
/// Interfaces
/////////
interface CubeChannel {
  readonly base: Channel
  get id(): string
  isDM(): this is CubeDMChannel
  isCategory(): this is CubeDMChannel
  isGuild(): this is CubeGuildChannel
  isText(): this is CubeTextChannel
}
export interface CubeTextChannel extends CubeChannel {
  readonly base: TextBasedChannel
  send(options: SendOptions): Promise<CubeMessage>
}
export interface CubeGuildChannel extends CubeChannel {
  readonly base: GuildBasedChannel
  get guild(): CubeGuild
}

export function createCubeTextChannel(channel?: TextBasedChannel | null): CubeTextChannel | null {
  if (!channel) return null
  if (channel.isDMBased()) return new CubeDMChannel(channel)
  return new CubeGuildTextChannel(channel)
}
export function createCubeGuildChannel(channel?: GuildBasedChannel | null): CubeGuildChannel | null {
  if (!channel) return null
  if (channel.isTextBased()) return new CubeGuildTextChannel(channel)
  if (channel.isVoiceBased()) return new CubeStageChannel(channel)
  return new CubeCategoryChannel(channel)
}


////////////////
/// Classes (implementation)
////////
export abstract class CubeBaseChannel implements CubeChannel {
  constructor(readonly base: Channel) {}
  get id() { return this.base.id }

  isDM = (): this is CubeDMChannel => this instanceof CubeDMChannel
  isCategory = (): this is CubeDMChannel => this instanceof CubeCategoryChannel
  isGuild = (): this is CubeGuildChannel =>
    this instanceof CubeGuildTextChannel || this instanceof CubeCategoryChannel
  isText = (): this is CubeTextChannel => 
    this instanceof CubeDMChannel || this instanceof CubeGuildTextChannel
}

type DiscordDMChannel = DMChannel | PartialDMChannel
export class CubeDMChannel extends CubeBaseChannel implements CubeTextChannel {
  constructor(readonly base: DiscordDMChannel) { super(base) }
  static maybe = (base?: DiscordDMChannel) => base ? new CubeDMChannel(base) : null
	async send(options: SendOptions) {
		return new CubeMessage(await this.base.send(setEmbedColor(options)))
	}
}

type DiscordGuildTextChannel = TextChannel | NewsChannel | PublicThreadChannel | PrivateThreadChannel | VoiceChannel
export class CubeGuildTextChannel extends CubeBaseChannel implements CubeTextChannel, CubeGuildChannel {
  constructor(readonly base: DiscordGuildTextChannel) { super(base) }
  static maybe = (base?: DiscordGuildTextChannel) => base ? new CubeGuildTextChannel(base) : null
  get guild() { return new CubeGuild(this.base.guild) }
  async send(options: SendOptions) {
    return new CubeMessage(await this.base.send(setEmbedColor(options)))
  }
}
export class CubeCategoryChannel extends CubeBaseChannel implements CubeGuildChannel {
  constructor(readonly base: CategoryChannel) { super(base) }
  static maybe = (base?: CategoryChannel) => base ? new CubeCategoryChannel(base) : null
  get guild() { return new CubeGuild(this.base.guild) }
}
export class CubeStageChannel extends CubeBaseChannel implements CubeGuildChannel {
  constructor(readonly base: StageChannel) { super(base) }
  static maybe = (base?: StageChannel) => base ? new CubeStageChannel(base) : null
  get guild() { return new CubeGuild(this.base.guild) }
}