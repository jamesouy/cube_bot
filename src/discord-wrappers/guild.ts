////////////////////////////////////////////////////////////////////////////
/// guild.ts
/// Wrapper class for the discord.js Guild
/// Includes useful methods to search for channels/members in the guild
///////////////////////////////////////////////////////////////////////////
import { isSnowflake } from '@utils'
import {
	Guild,
	GuildBasedChannel,
	FetchedThreads,
	GuildMember,
	GuildChannel,
	PermissionFlagsBits,
} from 'discord.js'
import {
  createCubeGuildChannel,
  CubeGuildChannel,
  CubeGuildTextChannel
} from './channels'
import { CubeMember } from './member'

export class CubeGuild {
	constructor(readonly base: Guild) {}
	static maybe = (base?: Guild | null) => base ? new CubeGuild(base) : null

	get id() { return this.base.id }
	get name() { return this.base.name }

	async fetchActiveThreads(maxRepeats = 5) {
		let threads = await this.base.channels.fetchActiveThreads()
		for (let i = 0; i < maxRepeats && threads.hasMore; i++)
			threads = await this.base.channels.fetchActiveThreads()
		return threads
	}

	private async searchChannel(
		channel?: string | {id?: string} | null, 
		filter: (channel: CubeGuildChannel) => boolean = () => true,
		member?: CubeMember | null,
	): Promise<CubeGuildChannel | null> {
		if (!channel) return null

		const _filter = (ch: CubeGuildChannel) => filter(ch) && 
			(member?.permissionsIn(ch).has([PermissionFlagsBits.ViewChannel]) ?? true)

		// don't need to fetch if already resolved
		if (channel instanceof GuildChannel && (channel.isTextBased() || channel.isThread() || channel.isVoiceBased())){
			const ch = createCubeGuildChannel(channel)
			return _filter(ch) ? ch : null
		}

		// fetch by ID
		if (typeof channel === 'object' || isSnowflake(channel)) {
			const channelId = typeof channel === 'object' ? channel.id : channel
			if (!channelId || !isSnowflake(channelId)) return null
			let ch = createCubeGuildChannel(await this.base.channels.fetch(channelId))
			if (!ch || !_filter(ch))
				ch = createCubeGuildChannel((await this.fetchActiveThreads()).threads.get(channelId))
			return (ch && _filter(ch)) ? ch : null
		}

		// fetch by name
		const channels = [
			...(await this.base.channels.fetch()).values(), 
			...(await this.fetchActiveThreads()).threads.values()
		].map(ch => createCubeGuildChannel(ch)).filter(_filter).filter(ch => ch.name.includes(channel))
		if (channels.length == 0) return null
		return channels.reduce((shortest, ch) => 
			(!shortest || ch.name.length < shortest.name.length) ? ch : shortest)
	}

	// async findThread(thread?: string | {id?: string} | null, member?: CubeMember | null) {
	// 	const ch = await this.searchChannel(thread, ch => ch.isThread(), member)
	// 	return ch?.isThread() ? new CubeGuildTextChannel(ch) : null
	// }

	async findTextChannel(channel?: string | {id?: string} | null, member?: CubeMember | null) {
		const ch = await this.searchChannel(channel, ch => ch.isText(), member)
		return ch?.isText() ? ch : null
	}

	async findChannel(channel?: string | {id?: string} | null, member?: CubeMember | null) {
		return await this.searchChannel(channel, () => true, member)
	}

  async findMember(member?: string | {user?: {id?: string}} | null): Promise<CubeMember | null> {
		if (!member) return null

		// no need to fetch if member already resolved
		if (member instanceof GuildMember) return new CubeMember(member)

		// fetch by ID
		if (typeof member === 'object' || isSnowflake(member)) {
			const memberId = typeof member === 'object' ? member?.user?.id : member
			if (!memberId || !isSnowflake(memberId)) return null
			return CubeMember.maybe(await this.base.members.fetch(memberId).catch(() => null))
		}

		// fetch by name
		return CubeMember.maybe((await this.base.members.fetch({ query: member })).first())
  }

	fetchRole = (role: string) => this.base.roles.fetch(role)
}