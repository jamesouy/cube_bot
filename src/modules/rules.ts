import { 
	SlashCommandBuilder, 
	SlashCommandStringOption, 
	PermissionFlagsBits, 
	ChannelType,
	TextInputBuilder,
	TextInputStyle,
} from 'discord.js'

import { UserError, Command, ConfigInitializer } from "bot-framework";
import { CubeGuild, CubeMessage, CubeModalBuilder, CubeTextChannel } from 'discord-wrappers'
import { capitalize, readUrl } from 'utils';


//////////////////
/// Rules Typing
////////
interface RulesConfig {
	channel: string,
	messages: string[],
	title: string,
	summary: string,
	rules: Section[],
}
interface Section {
	title: string,
	rules: Rule[],
}
interface Rule {
	title: string,
	content: string,
}
interface RuleID {
	section: number,
	num: number,
}
type RulesExport = Omit<RulesConfig, 'channel' | 'messages'>


/////////////////////////////////////////
/// String <-> Rule Index Conversion
////////////////
function parseSectionLetter(sectionLetter: string): number | null {
	sectionLetter = sectionLetter.trim()
	if (sectionLetter.length != 1) return null
	const section = sectionLetter.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0)
	if (section < 0 || section > 25) return null
	return section
}
function parseRuleNum(ruleNum: string): RuleID | null {
	const split = ruleNum.trim().split('.')
	if (split.length != 2) return null
	const section = parseSectionLetter(split[0])
	if (section == null) return null
	const num = parseInt(split[1].trim())
	if (isNaN(num)) return null
	return { section, num: num-1 }
}
function stringifySection(section: number) {
	return String.fromCharCode('A'.charCodeAt(0)+section)
}
function stringifyRuleId({section, num}: RuleID) {
	return `${stringifySection(section)}.${num+1}`
}


/////////////////////////
/// Rule/Index Validation
//////////
function isSectionInRange(section: number, insert = false): boolean {
	return section < config.rules.length + (+insert) || section >= 0
}
function isRuleInRange({section, num}: RuleID, insert = false): boolean {
	return isSectionInRange(section) && num < config.rules[section].rules.length + (+insert) && num >= 0
}

function isRule(obj: any): obj is Rule {
	if (!obj || Object.keys(obj).length != 2 || !('title' in obj && 'content' in obj)) return false
	if (typeof obj.title !== 'string' || typeof obj.content !== 'string') return false
	return true
}
function isSection(obj: any): obj is Section {
	if (!obj || Object.keys(obj).length != 2 || !('title' in obj && 'rules' in obj)) return false 
	if (typeof obj.title !== 'string' || !Array.isArray(obj.rules)) return false
	for (const rule of obj.rules) if (!isRule(rule)) return false
	return true
}
function isRulesExport(obj: any): obj is RulesExport {
	if (!obj || Object.keys(obj).length != 3 || !('title' in obj && 'summary' in obj && 'rules' in obj)) return false
	if (typeof obj.title !== 'string' || typeof obj.summary !== 'string') return false
	if (!Array.isArray(obj.rules)) return false
	for (const section of obj.rules) if (!isSection(section)) return false
	return true
}


/////////////////////
/// Rule Embeds
/////////
const getSummaryEmbed = () => [{ 
		title: config.title.trim() || 'title not set', 
		description: config.summary.trim() || 'summary not set'
	}]
const getRuleEmbed = ({title, content}: Rule) => [{ 
	title: title.trim() || 'title not set', 
	description: content.trim() || 'content not set' 
}]
const getSectionTitleEmbed = (title: string) => [{ title: title.trim() || 'title not set' }]
const getSectionEmbed = (section: number, {title, rules}: Section = config.rules[section]) => [{
	title: title.trim() || 'no section title set',
	fields: rules.map(({title, content}, num) => { return {
		name: `Rule ${stringifyRuleId({section, num})}: ${title.trim() || 'no rule title set'}`, 
		value: content.trim() || 'no rule content set', 
		inline: false,
	}})
}]


async function sendRules(channel: CubeTextChannel): Promise<CubeMessage[]> {
	const messages: CubeMessage[] = []
	messages.push(await channel.send({ embeds: getSummaryEmbed() }))
	for (const section of config.rules.keys()) {
		messages.push(await channel.send({ embeds: getSectionEmbed(section) }))
	}
	return messages
}

// get the messages for each section where the rules were published with /rules publish
// returns null if at least one of the messages has been deleted
async function fetchPublishedMessages(guild?: CubeGuild): Promise<CubeMessage[] | null> {
	if (config.messages.length < config.rules.length+1) return null
	const channel = await guild?.findTextChannel({id: config.channel})
	if (!channel) return null
	const messages: CubeMessage[] = []
	for (let i = 0; i < config.rules.length+1; i++) {
		try {
			const message = await channel.base.messages.fetch(config.messages[i])
			if (!message.editable) return null
			messages.push(new CubeMessage(message))
		} catch (err) {
			console.error("couldn't fetch rule message", err)
			return null
		}
	}
	return messages
}


///////////////////////////
/// Exporting/Importing
/////////////
function getRulesExport(): Buffer {
	const data: RulesExport = {
		title: config.title,
		summary: config.summary,
		rules: config.rules,
	}
	return Buffer.from(JSON.stringify(data, null, 4))
}
// returns false if given data is invalid
function saveRulesImport(data: string): boolean {
	try {
		const obj = JSON.parse(data)
		if (!isRulesExport(obj)) return false
		config.title = obj.title
		config.summary = obj.summary
		config.rules = obj.rules
		config.save()
	} catch (err) {
		return false
	}
	return true
}


///////////////////////////
/// Custom Slash Command Options
///////////
const myStringOption = (name: string, description: string) =>
new SlashCommandStringOption()
	.setName(name)
	.setDescription(description)
	.setRequired(true)

const ruleNumberOption = (description: string, name = 'rule-number') => 
	myStringOption(name, `${description} (B.2 would be section B rule 2)`)
const ruleSectionOption = (description: string, name = 'section') => myStringOption(name, description)
const sectionTitleOption = () => myStringOption('title', 'Section title')


//////////////////////
/// Modal Fields
//////////
const myTextField = (id: string, style: TextInputStyle, length: number, placeholder?: string) =>
new TextInputBuilder()
	.setCustomId(id)
	.setLabel(capitalize(id))
	.setStyle(style)
	.setMaxLength(length)
	.setPlaceholder(capitalize(id)+'...')
	.setValue(placeholder ?? '')

const titleTextField = (placeholder?: string) => 	 myTextField('title', TextInputStyle.Short, 256, placeholder)
const contentTextField = (placeholder?: string) => myTextField('content', TextInputStyle.Paragraph, 1024, placeholder)
const summaryTextField = (placeholder?: string) => myTextField('summary', TextInputStyle.Paragraph, 2048, placeholder)


/////////////////////////
/// Command Logic
///////////

export const config = ConfigInitializer.create<RulesConfig>('rules.json')

export const rulesCommand = new Command({
	name: 'Rules',
	detail: `Details stuff`,
	builder: new SlashCommandBuilder()
		.setName('rules')
		.setDescription('Manage the server rules')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.setDMPermission(false)

		.addSubcommand(subcommand => subcommand
			.setName('edit-summary')
			.setDescription('Edit the rules summary'))

		.addSubcommand(subcommand => subcommand
			.setName('edit')
			.setDescription('Edit a rule')
			.addStringOption(ruleNumberOption('Rule to edit')))

		.addSubcommand(subcommand => subcommand
			.setName('add')
			.setDescription('Add a rule')
			.addStringOption(ruleSectionOption('Section to add to')))

		.addSubcommand(subcommand => subcommand
			.setName('remove')
			.setDescription('Remove a rule')
			.addStringOption(ruleNumberOption('Rule to remove')))

		.addSubcommand(subcommand => subcommand
			.setName('move')
			.setDescription('Move a rule')
			.addStringOption(ruleNumberOption('Rule to move', 'from'))
			.addStringOption(ruleNumberOption('Position to move to', 'to')))

		.addSubcommand(subcommand => subcommand
			.setName('edit-section')
			.setDescription('Edit a section\'s title')
			.addStringOption(ruleSectionOption('Section to edit'))
			.addStringOption(sectionTitleOption))

		.addSubcommand(subcommand => subcommand
			.setName('add-section')
			.setDescription('Add a section')
			.addStringOption(sectionTitleOption))

		.addSubcommand(subcommand => subcommand
			.setName('remove-section')
			.setDescription('Remove a section')
			.addStringOption(ruleSectionOption('Section to remove')))

		.addSubcommand(subcommand => subcommand
			.setName('move-section')
			.setDescription('Move a section')
			.addStringOption(ruleSectionOption('Section to move', 'from'))
			.addStringOption(ruleSectionOption('Letter to move to', 'to')))

		.addSubcommand(subcommand => subcommand
			.setName('test')
			.setDescription('Send the rules in the current channel for testing purposes'))

		.addSubcommand(subcommand => subcommand
			.setName('publish')
			.setDescription('Update the published rules with your changes')
			.addChannelOption(option => option
				.setName('channel')
				.setDescription('Channel to publish to')
				.addChannelTypes(ChannelType.GuildText)))

		.addSubcommand(subcommand => subcommand
			.setName('export')
			.setDescription('Export the rules'))

		.addSubcommand(subcommand => subcommand
			.setName('import')
			.setDescription('Import rules')
			.addAttachmentOption(option => option
				.setName('import-file')
				.setDescription('A file created from a rule export')
				.setRequired(true))),
		
	ephemeral(interaction) {
		const subcommand = interaction.options.getSubcommand()
		if ([
			'edit-summary', 'edit', 'add', 'remove', 'move', 
			'edit-section', 'add-section', 'remove-section', 'move-section',
			'export', 'import'
		].includes(subcommand)) return true
		else return false
	},

	async run(interaction) {

		//////////////////////////////////////////
		/// Slash command option getter functions
		/////////////////
		function getRuleIdOption(name: string, insert = false): RuleID {
			const ruleIdStr = interaction.options.getString(name) ?? ''
			const ruleId = parseRuleNum(ruleIdStr) as RuleID
			if (!ruleId) 
				throw new UserError(`Invalid rule format "${ruleIdStr}"`)
			else if (!isRuleInRange(ruleId, insert)) 
				throw new UserError(`Rule "${ruleIdStr}" is out of range`)
			return ruleId
		}
		function getSectionIdOption(name: string, insert = false): number {
			const sectionIdStr = interaction.options.getString(name) ?? ''
			const sectionId = parseSectionLetter(sectionIdStr) as number
			if (sectionId == null) 
				throw new UserError(`Invalid section "${sectionIdStr}"`)
			else if (!isSectionInRange(sectionId, insert)) 
				throw new UserError(`Section "${sectionIdStr}" is out of range`)
			return sectionId
		}

		switch (interaction.options.getSubcommand()) {
			case 'edit-summary': {
				const modalInteraction = await interaction.awaitModal(new CubeModalBuilder()
					.setCustomId('rules-edit-summary')
					.setTitle('Editing Rules Summary')
					.addTextInput(titleTextField(config.title))
					.addTextInput(summaryTextField(config.summary)))
				if (modalInteraction) {
					config.title = modalInteraction.fields.getTextInputValue('title')
					config.summary = modalInteraction.fields.getTextInputValue('summary')
					config.save()
					return modalInteraction.reply({
						content: `Updated summary`,
						embeds: getSummaryEmbed(),
					})
				}
			}
			case 'edit': {
				const ruleId = getRuleIdOption('rule-number')
				const rule = config.rules[ruleId.section].rules[ruleId.num]
				const modalInteraction = await interaction.awaitModal(new CubeModalBuilder()
					.setCustomId('rules-edit')
					.setTitle(`Editing Rule ${stringifyRuleId(ruleId)}`)
					.addTextInput(titleTextField(rule.title))
					.addTextInput(contentTextField(rule.content)))
				if (modalInteraction) {
					rule.title = modalInteraction.fields.getTextInputValue('title')
					rule.content = modalInteraction.fields.getTextInputValue('content')
					config.rules[ruleId.section].rules[ruleId.num] = rule;
					config.save()
					return modalInteraction.reply({
						content: `Updated rule ${stringifyRuleId(ruleId)}`,
						embeds: getRuleEmbed(rule),
					})
				}
			}
			case 'add': {
				const sectionId = getSectionIdOption('section')
				const modalInteraction = await interaction.awaitModal(new CubeModalBuilder()
					.setCustomId('rules-add')
					.setTitle(`Adding Rule to Section ${stringifySection(sectionId)}`)
					.addTextInput(titleTextField())
					.addTextInput(contentTextField()))
				if (modalInteraction) {
					const rule = {
						title: modalInteraction.fields.getTextInputValue('title'),
						content: modalInteraction.fields.getTextInputValue('content'),
					}
					config.rules[sectionId].rules.push(rule)
					config.save()
					return modalInteraction.reply({
						content: `Added rule ${stringifyRuleId({ 
							section: sectionId, 
							num: config.rules[sectionId].rules.length-1
						})}`,
						embeds: getRuleEmbed(rule),
					})
				}
			} 
			case 'remove': {
				const ruleId = getRuleIdOption('rule-number')
				const rule = config.rules[ruleId.section].rules.splice(ruleId.num, 1)[0]
				config.save()
				return interaction.reply({
					content: `Removed rule ${stringifyRuleId(ruleId)}`,
					embeds: getRuleEmbed(rule),
				})
			} 
			case 'move': {
				const ruleFrom = getRuleIdOption('from')
				const rule = config.rules[ruleFrom.section].rules.splice(ruleFrom.num, 1)[0]
				const ruleTo = getRuleIdOption('to', true)
				config.rules[ruleTo.section].rules.splice(ruleTo.num, 0, rule)
				config.save()
				return interaction.reply({
					content: `Moved rule ${stringifyRuleId(ruleFrom)} to position ${stringifyRuleId(ruleTo)}`,
					embeds: getRuleEmbed(rule)
				})
			}
			case 'edit-section': {
				const sectionId = getSectionIdOption('section')
				config.rules[sectionId].title = interaction.options.getString('title') ?? config.rules[sectionId].title
				config.save()
				return interaction.reply({
					content: `Updated section ${stringifySection(sectionId)} title`,
					embeds: getSectionTitleEmbed(config.rules[sectionId].title)
				})
			}
			case 'add-section': {
				const section = { title: interaction.options.getString('title') ?? '', rules: [] }
				config.rules.push(section)
				config.save()
				return interaction.reply({
					content: `Added section ${stringifySection(config.rules.length-1)}`,
					embeds: getSectionTitleEmbed(section.title)
				})
			}
			case 'remove-section': {
				const sectionId = getSectionIdOption('section')
				const section = config.rules.splice(sectionId, 1)[0]
				config.save()
				return interaction.reply({
					content: `Removed section ${stringifySection(sectionId)}`,
					embeds: getSectionEmbed(sectionId, section)
				})
			}
			case 'move-section': {
				const from = getSectionIdOption('from')
				const section = config.rules.splice(from, 1)[0]
				const to = getSectionIdOption('to', true)
				config.rules.splice(to, 0, section)
				config.save()
				return interaction.reply({
					content: `Moved section ${stringifySection(from)} to position ${stringifySection(to)}`,
					embeds: getSectionTitleEmbed(section.title)
				})
			}
			case 'test': {
				if (interaction.channel) return sendRules(interaction.channel)
				else return new UserError('Oops! Couldn\'t find this channel. Try using the command again')
			}
			case 'publish': {
				const messages = await fetchPublishedMessages(interaction.guild ?? undefined)
				if (messages) {
					await messages[0].edit({embeds: getSummaryEmbed()})
					for (const section of config.rules.keys()) 
						await messages[section+1].edit({embeds: getSectionEmbed(section)})
					return
				}
				const channel = await interaction.getTextChannelOption('channel')
				if (!channel) throw new UserError('No channel to publish to!', true)
				config.messages = (await sendRules(channel)).map(message => message.id)
				config.channel = channel.id
				config.save()
				return
			}
			case 'export': {
				return interaction.reply({files: [{
					attachment: getRulesExport(),
					name: 'rules.json',
				}]})
			}
			case 'import': {
				const attachment = interaction.options.getAttachment('import-file', true)
				if (attachment.size > 1_000_000) throw new UserError('File is to big!')
				if (!saveRulesImport(await readUrl(attachment.url))) throw new UserError('Incorrect format!')
				return interaction.reply({
					content: 'old rules:',
					files: [{
						attachment: getRulesExport(),
						name: 'rules.json'
					}]
				})
			}
			default:
				throw new UserError('Oops! Subcommand not implemented', true)
		}
	}
})