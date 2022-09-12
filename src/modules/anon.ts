// Send anonymous messages to channels

import { 
	ChannelType, 
	Collection, 
	PermissionFlagsBits, 
	SlashCommandBuilder, 
} from "discord.js";
import { createHash } from 'node:crypto'
import { UserError, Command, ConfigInitializer } from "@bot-framework";
import '@utils'
import { stripIndent } from "common-tags";
import { CubeTextChannel } from "@utils";

export const config = ConfigInitializer.create<{
	logChannel: string
	banned: {
		[key: string]: {
			end?: number
			reason?: string
		}
	}
	currHour: number
	muted: {
		[key: string]: string | undefined
	}
	tags: {
		[key: string]: number[]
	}
	prevTags: { // tags for previous reset
		[key: string]: number[]
	}
}>('anon.json', () => {
	const set = new Set(new Array(10000).keys())
	for (const id in config.tags)
		for (const tag of config.tags[id])
			set.delete(tag)
	unclaimed = Array.from(set)
	resetTags()
})
let unclaimed: number[]

function resetTags(forced = false) {
	const now = new Date()
	now.setMinutes(0, 0, 0)
	if (forced || now.getTime() > config.currHour) {
		unclaimed = Array.from(new Array(10000).keys())
		config.currHour = now.getTime()
		config.muted = {}
		config.prevTags = config.tags
		config.tags = {}
		config.save()
	}
}
function checkBan(uid: string) {
	if (uid in config.banned) {
		const { end, reason } = config.banned[uid]
		if (end && end <= Date.now()) {
			const ban = config.banned[uid]
			delete config.banned[uid]
			sendUnbanLog(uid, ban)
		} else {
			let msg = 'You are currently banned from sending anonymous messages'
			if (end) msg += ` until <t:${Math.floor(end/1000)}>`
			if (reason) msg += `. Reason: \n> ${reason}`
			msg += '\nIf you think this was a mistake, please contact a moderator'
			throw new UserError(msg)
		}
	}
}
function checkMute (uid: string) {
	if (uid in config.muted) {
		let msg = `You are currently muted from sending anonymous messages until the end of the hour`
		if (config.muted[uid]) msg += `. Reason: \n> ${config.muted[uid]}`
		throw new UserError(msg)
	}
}
function findUserByTag(tag: number) {
	for (const id in config.tags)
		for (const tag of config.tags[id])
			if (tag) return id
	return null
}
// get the display username of an anonymous user
const getName = (tag: number, justTag = false) => `${
	justTag ? '' : 'Anonymous'
}#${tag.toLocaleString('en-US', {
	minimumIntegerDigits: 4, useGrouping: false
})}`
async function sendUnbanLog(uid: string, {end, reason}: {end?: number, reason?: string}) {
	return (await bot.guild.findTextChannel({id: config.logChannel}))?.send({embeds: [{
		title: 'Anon Unban',
		description: stripIndent`
			*Offender:* <@!${uid}> (@${(await bot.guild.findMember(uid))?.tag})
			*Reason:* ${reason ?? 'No reason given'}
		`
	}]})
}

export const anonMod = new Command({
	name: 'Anon Moderation',
	builder: new SlashCommandBuilder()
		.setName('anon-mod')
		.setDescription('Moderation commands for /anon')
		.setDMPermission(false)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

		.addSubcommand(subcommand => subcommand
			.setName('log')
			.setDescription('Change the anon mod log channel')
			.addChannelOption(option => option
				.setName('channel')
				.setDescription('The channel to send mute/ban messages to')
				.addChannelTypes(ChannelType.GuildText)
				.setRequired(false)))

		.addSubcommand(subcommand => subcommand
			.setName('mute')
			.setDescription('Temporarily mute a user from sending anonymous messages until the next reset')
			.addNumberOption(option => option
				.setName('tag')
				.setDescription('The tag of the anonymous user to mute')
				.setMinValue(0)
				.setMaxValue(9999)
				.setRequired(false))
			.addStringOption(option => option
				.setName('reason')
				.setDescription('Reason for the mute')
				.setRequired(false)))

		.addSubcommand(subcommand => subcommand
			.setName('unmute')
			.setDescription('Unmute a user from sending anonymous messages')
			.addNumberOption(option => option
				.setName('tag')
				.setDescription('The tag of the anonymous user to unmute')
				.setMinValue(0)
				.setMaxValue(9999)
				.setRequired(true)))

		.addSubcommand(subcommand => subcommand
			.setName('ban')
			.setDescription('Ban a user from sending anonymous messages')
			.addNumberOption(option => option
				.setName('tag')
				.setDescription('The tag of the anonymous user to ban')
				.setMinValue(0)
				.setMaxValue(9999)
				.setRequired(false))
			.addUserOption(option => option
				.setName('user')
				.setDescription('The user to ban')
				.setRequired(false))
			.addNumberOption(option => option
				.setName('days')
				.setDescription('Number of days to ban for')
				.setMinValue(1)
				.setRequired(false))
			.addNumberOption(option => option
				.setName('hrs')
				.setDescription('Number of hours to ban for')
				.setMinValue(1)
				.setMaxValue(23)
				.setRequired(false))
			.addNumberOption(option => option
				.setName('mins')
				.setDescription('Number of minutes to ban for')
				.setMinValue(1)
				.setMaxValue(59)
				.setRequired(false))
			.addStringOption(option => option
				.setName('reason')
				.setDescription('Reason for the ban')
				.setRequired(false)))
		
		.addSubcommand(subcommand => subcommand
			.setName('unban')
			.setDescription('Unban a user from sending anonymous messages')
			.addUserOption(option => option
				.setName('user')
				.setDescription('The user to unban')
				.setRequired(true)))

		.addSubcommand(subcommand => subcommand
			.setName('reset')
			.setDescription('Force a /anon tag reset server-wide')),

	async run(interaction) {
		switch (interaction.options.getSubcommand()) {
			case 'log': {
				const channel = await interaction.getTextChannelOption('channel')
				if (!channel) 
					return interaction.replyEphemeral(`Anon log channel currently set to: <#${config.logChannel}>`)
				
				config.logChannel = channel.id
				await config.save()
				return interaction.reply(`Anon log channel set to <#${config.logChannel}>`)
			}
			case 'mute': {
				const tag = interaction.options.getNumber('tag')

				// show list
				if (tag == null) return interaction.replyEphemeral({ embeds: [{
					title: 'Current Anon Mutelist',
					description: Object.keys(config.muted).map((uid, i) => {
						let str = `${i+1}. ${config.tags[uid].map(tag => getName(tag, true)).join(', ')}`
						if (config.muted[uid]) str += `\n> Reason: ${config.muted[uid]}`
						return str
					}
					).join('') || 'No one is currently muted'
				}]})

				const uid = findUserByTag(tag)
				if (!uid) throw new UserError(`The tag ${getName(tag, true)} has not been claimed for the current hour yet`)
				if (uid in config.muted) throw new UserError('That user has already been muted')
				const reason = interaction.options.getString('reason')
				config.muted[uid] = reason ?? undefined
				await config.save()

				await (await bot.guild.findTextChannel({id: config.logChannel}))?.send({embeds: [{
					title: 'Anon Mute',
					description: stripIndent`
						*Offender:* ${getName(tag)}
						*Reason:* ${reason ?? 'No reason given'}
					`
				}]})

				let str = `Muted ${getName(tag)} until the end of the hour`
				if (reason) str += `. Reason: \n> ${reason}`
				return interaction.reply(str)
			}
			case 'unmute': {
				const tag = interaction.options.getNumber('tag', true)
				const uid = findUserByTag(tag)
				if (!uid) throw new UserError(`There is no user with the tag ${getName(tag, true)}`)
				if (!(uid in config.muted)) throw new UserError(`The user with the tag ${getName(tag, true)} is not currently muted`)
				delete config.muted[uid]
				config.save()

				await (await bot.guild.findTextChannel({id: config.logChannel}))?.send({embeds: [{
					title: 'Anon Unmute',
					description: stripIndent`
						*Offender:* ${getName(tag)}
					`
				}]})

				return interaction.reply(`Unmuted ${getName(tag)}`)
			}
			case 'ban': { 
				const tag = interaction.options.getNumber('tag')
				let user = interaction.options.getUser('user')
				let uid = user?.id ?? null

				if (tag != null) {
					if (uid) throw new UserError('Cannot specify tag and user at the same time!')
					else {
						uid = findUserByTag(tag)
						if (!uid) throw new UserError(`The tag ${getName(tag, true)} has not been claimed for the current hour yet`)
					}
				}  // show list
				else if (!uid) return interaction.replyEphemeral({ embeds: [{
					title: 'Anon Banlist',
					description: (await Promise.all(Object.keys(config.banned).map(async (uid, i) => {
						const { end, reason } = config.banned[uid]
						let str = `${i+1}. <@!${uid}> (@${(await bot.guild.findMember(uid))?.tag})`
						if (end) str += `\n> Unban <t:${Math.floor(end/1000)}:R>`
						if (reason) str += `\n> Reason: ${reason}`
						return str
					}))).join('\n') || 'No one is currently banned'
				}]})

				if (uid in config.banned) throw new UserError('That user has already been banned')

				const days = interaction.options.getNumber('days') ?? 0
				const hrs = interaction.options.getNumber('hrs') ?? 0
				const mins = interaction.options.getNumber('mins') ?? 0
				const time = ((days*24 + hrs)*60 + mins)*60*1000 // duration in millisecs

				const reason = interaction.options.getString('reason')

				config.banned[uid] = {}
				if (time > 0) config.banned[uid].end = Date.now()+time
				if (reason) config.banned[uid].reason = reason
				config.save()

				const end = config.banned[uid].end
				user ??= (await bot.guild.findMember(uid))?.user ?? null
				await (await bot.guild.findTextChannel({id: config.logChannel}))?.send({embeds: [{
					title: 'Anon Ban',
					description: stripIndent`
						*Offender:* <@!${uid}> ${user ? `(@${user.tag})` : ''} ${
							tag ? '- '+config.tags[uid].map(tag => getName(tag, true)).join(', ') : ''}
						*End time:* ${end ? `<t:${Math.floor(end/1000)}:R>` : 'Never'}
						*Reason:* ${reason ?? 'No reason given'}
					`
				}]})

				let str = `Banned ${
					tag == null ? `<@!${uid}> `+(user?`(@${user.tag})`:'') : getName(tag)
				} from sending anonymous messages`
				if (end) str += ` until <t:${Math.floor(end/1000)}>`
				if (reason) str += `. Reason: \n> ${reason}`
				return interaction.reply({ content: str, ephemeral: tag == null})
			}
			case 'unban': {
				const uid = interaction.options.getUser('user', true).id
				if (!(uid in config.banned)) throw new UserError(`That user is not currently banned`)
				const ban = config.banned[uid]
				delete config.banned[uid]
				config.save()

				await sendUnbanLog(uid, ban)
				return interaction.replyEphemeral(`Unbanned <@!${uid}> (@${
					(await bot.guild.findMember(uid))?.tag}) from sending anonymous messages`)
			}
			case 'reset': {
				resetTags(true)
			}
		}
	}
})



export const anonCommand = new Command({
	name: 'Anon',
	ephemeral: () => true,
	builder: new SlashCommandBuilder()
		.setName('anon')
		.setDescription('Send a message anonymously')
		.setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
		.setDMPermission(false)
		.addStringOption(option => option
			.setName('message')
			.setDescription('The message to send')
			.setRequired(true)),
	async run(interaction) {
		const uid = interaction.user.id

		checkBan(uid)
		resetTags()
		checkMute(uid)

		// get member
		const member = await interaction.fetchMember()
		if (!member) throw new UserError('Could not determine your channel permissions! Please try again')

		// get channel
		const channel = interaction.channel;
		if (!channel) throw new UserError('Could not determine the channel you are in! Please try again')
		if (!channel.isGuild()) throw new UserError('Cannot use this command in DMs!')

		// get and process message
		let message = interaction.options.getString('message', true)
		if (!member.permissionsIn(channel).has([PermissionFlagsBits.MentionEveryone])) // @everyone
			message = message.replace('@everyone', '`@everyone`')
		message = await message.replaceAsync(/<@&(\d+)>/g, async str => { // role mentions
			const role = await bot.guild.fetchRole(str.slice(3, -1))
			if (!role || member.canMention(role, channel)) return str
			else return `@${role.name}`
		})
		if ((message.match(/<@[&!]?(\d+)>/g)?.length ?? 0 > 7) && 
		!member.permissionsIn(channel).has([PermissionFlagsBits.Administrator]))
			throw new UserError('Too many mentions! You can mention at most 7 users/roles')
		if (message.length > 2000)
			throw new UserError(`Message too long! (${message.length}/2000 characters)`)
		
		// get user tag
		let userTags = config.tags[uid]
		if (!userTags || userTags.length == 0) {
			if (unclaimed.length == 0) throw new UserError('No anonymous user slots left! Please wait until the next hour')
			userTags = [unclaimed[Math.floor(Math.random() * unclaimed.length)]]
			config.tags[uid] = userTags
			config.save()
		}
		const tag = userTags[userTags.length-1]

		// send
		await channel.sendWebhook({
			username: `Anonymous#${tag.toLocaleString('en-US', {
				minimumIntegerDigits: 4,
				useGrouping: false
			})}`,
			// avatarURL: `https://source.boringavatars.com/marble/128/${
			// 	hash.digest('base64url')
			// }?colors=00AAFF,EE7700,FFEEDD,0077CC,FF6688`,
			//a67c59
			avatarURL: `https://i.pickadummy.com/index.php?imgsize=128&w=${
				tag % 2 == 0 ? '5994a6' : 'a67c59'
			}&contrast=1&cache=${
				createHash('md5').update(process.env.BOT_TOKEN+uid+tag+config.currHour).digest('base64url')
			}`,
			content: message,
		}).catch(err => {
			if (err instanceof Error && err.message === 'Cannot create webhooks in this channel')
				throw new UserError('Could not create a webhook! Please contact a moderator')
			else throw err
		})

		return interaction.replyEphemeral('Sent!')
	},
})

export const anonRetagCommand = new Command({
	name: 'Anon Retag',
	ephemeral: () => true,
	builder: new SlashCommandBuilder()
		.setName('anon-retag')
		.setDescription('Reset your anonymous user tag (max 3 times per hour)')
		.setDMPermission(false),
	run(interaction) {
		const uid = interaction.user.id

		checkBan(uid)
		resetTags()
		checkMute(uid)
		
		let userTags = config.tags[uid]
		if (!userTags || userTags.length == 0)
			throw new UserError("You don't have a tag to reset! Send an anonymous message with /anon first")
		if (userTags.length > 3)
			throw new UserError(stripIndent`
				You have already reset your tag 3 times this hour. Please wait 
				until the next hour for your tag to automatically be reset
			`)
		if (unclaimed.length == 0) throw new UserError('No anonymous user slots left! Please wait until the next hour')
		config.tags[uid].push(unclaimed[Math.floor(Math.random() * unclaimed.length)])
		config.save()

		userTags = config.tags[uid]
		return interaction.replyEphemeral(`Done: #${userTags[userTags.length-2]} -> #${userTags[userTags.length-1]}`)
	}
})