//////////////////////////////////////////////////
/// channels.ts
/// Wrapper classes for discord.js channels
/// 4 types: DM, guild text, category, and stage
//////////////////////////////////////////////////
import { 
	APIEmbed, 
	TextBasedChannel,
	MessageOptions,
	GuildBasedChannel,
  NewsChannel,
  TextChannel,
  PublicThreadChannel,
  PrivateThreadChannel,
  CategoryChannel,
  VoiceChannel,
  Channel,
  DMChannel,
  PartialDMChannel,
  StageChannel,
  BufferResolvable,
  Webhook,
  Collection,
  WebhookMessageOptions,
} from 'discord.js'
import { CubeMessage, setEmbedColor } from '@discord-wrappers'

const cachedWebhooks = new Collection<string, Webhook>()

export type SendOptions = string | (Omit<MessageOptions, 'embeds'> & { embeds?: APIEmbed[] })
export type WebhookSendOptions = Omit<WebhookMessageOptions, 'flags'>

/////////////////
/// Interfaces
/////////
interface CubeChannel {
  readonly base: Channel
  get id(): string
  isDM(): this is CubeDMChannel
  isCategory(): this is CubeCategoryChannel
  isGuild(): this is CubeGuildChannel
  isText(): this is CubeTextChannel
}
export interface CubeTextChannel extends CubeChannel {
  readonly base: TextBasedChannel
  send(options: SendOptions): Promise<CubeMessage>
  isGuild(): this is CubeGuildTextChannel
}
export interface CubeGuildChannel extends CubeChannel {
  readonly base: GuildBasedChannel
  get name(): string
  isText(): this is CubeGuildTextChannel
}

export function createCubeTextChannel(channel: TextBasedChannel): CubeTextChannel
export function createCubeTextChannel(channel?: null): null
export function createCubeTextChannel(channel?: TextBasedChannel | null): CubeTextChannel | null
export function createCubeTextChannel(channel?: TextBasedChannel | null): CubeTextChannel | null {
  if (!channel) return null
  if (channel.isDMBased()) return new CubeDMChannel(channel)
  return new CubeGuildTextChannel(channel)
}
export function createCubeGuildChannel(channel: GuildBasedChannel): CubeGuildChannel
export function createCubeGuildChannel(channel?: null): null
export function createCubeGuildChannel(channel?: GuildBasedChannel | null): CubeGuildChannel | null
export function createCubeGuildChannel(channel?: GuildBasedChannel | null): CubeGuildChannel | null {
  if (!channel) return null
  if (channel.isTextBased()) return new CubeGuildTextChannel(channel)
  if (channel.isVoiceBased()) return new CubeStageChannel(channel)
  return new CubeCategoryChannel(channel)
}


////////////////
/// Classes (implementation)
////////
abstract class CubeBaseChannel {
  constructor(readonly base: Channel) {}
  get id() { return this.base.id }
  get mention() { return `<#${this.id}>` }
}

type DiscordDMChannel = DMChannel | PartialDMChannel
export class CubeDMChannel extends CubeBaseChannel implements CubeTextChannel {
  constructor(readonly base: DiscordDMChannel) { super(base) }
  static maybe = (base?: DiscordDMChannel) => base ? new CubeDMChannel(base) : null
	async send(options: SendOptions) {
		return new CubeMessage(await this.base.send(setEmbedColor(options)))
	}
  isDM = (): this is CubeDMChannel => true
  isCategory = (): this is CubeCategoryChannel => false
  isGuild = (): this is CubeGuildTextChannel => false
  isText = (): this is CubeTextChannel => true
}

type DiscordGuildTextChannel = TextChannel | NewsChannel | PublicThreadChannel | PrivateThreadChannel | VoiceChannel
export class CubeGuildTextChannel extends CubeBaseChannel implements CubeTextChannel, CubeGuildChannel {
  constructor(readonly base: DiscordGuildTextChannel) { super(base) }
  get name() { return this.base.name }
  static maybe = (base?: DiscordGuildTextChannel) => base ? new CubeGuildTextChannel(base) : null
  async send(options: SendOptions) {
    return new CubeMessage(await this.base.send(setEmbedColor(options)))
  }
  async sendWebhook(options: WebhookSendOptions): Promise<CubeMessage> {
    const ch = this.base.isThread() ? this.base.parent : this.base
    if (!ch) throw new Error('Cannot create webhooks in this channel');
    let webhook = cachedWebhooks.get(ch.id)
    if (webhook) try {
      return new CubeMessage(await webhook.send(options))
    } catch {}
    webhook = (await ch.fetchWebhooks()).find(wh => wh.token != null) ?? await ch.createWebhook({ name: "CubeWebhook" })
    cachedWebhooks.set(ch.id, webhook)
    return new CubeMessage(await webhook.send(options))
  }
  isDM = (): this is CubeDMChannel => false
  isCategory = (): this is CubeCategoryChannel => false
  isGuild = (): this is CubeGuildTextChannel => true
  isText = (): this is CubeGuildTextChannel => true
}
export class CubeCategoryChannel extends CubeBaseChannel implements CubeGuildChannel {
  constructor(readonly base: CategoryChannel) { super(base) }
  get name() { return this.base.name }
  static maybe = (base?: CategoryChannel) => base ? new CubeCategoryChannel(base) : null
  isDM = (): this is CubeDMChannel => false
  isCategory = (): this is CubeCategoryChannel => true
  isGuild = (): this is CubeGuildChannel => true
  isText = (): this is CubeGuildTextChannel => false
}
export class CubeStageChannel extends CubeBaseChannel implements CubeGuildChannel {
  constructor(readonly base: StageChannel) { super(base) }
  get name() { return this.base.name }
  static maybe = (base?: StageChannel) => base ? new CubeStageChannel(base) : null
  isDM = (): this is CubeDMChannel => false
  isCategory = (): this is CubeCategoryChannel => false
  isGuild = (): this is CubeGuildChannel => true
  isText = (): this is CubeGuildTextChannel => false
}