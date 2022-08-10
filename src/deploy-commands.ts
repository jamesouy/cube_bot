import { stripIndents } from 'common-tags'
import { join } from 'path'
import { REST } from '@discordjs/rest'
import { Routes } from 'discord.js'
import * as dotenv from "dotenv"

import { BaseCommand, Command, ContextMenu } from 'bot-framework';
import { getAllOfType } from 'utils';

dotenv.config()

getAllOfType(BaseCommand, join(__dirname, 'modules')).then(commands => {
	const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
	
	// delete all commands
	// uncomment if removed/renamed some commands, but it isn't being updated in the server
	// rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: [] })
	// 	.then(() => console.log('Successfully deleted all guild commands.'))
	// 	.catch(console.error);
	// rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: [] })
	// 	.then(() => console.log('Successfully deleted all guild commands.'))
	// 	.catch(console.error);


	/// Register commands
	rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { 
		body: commands.map(command => command.getData())
	}).then(() => {
		const slashCommands = commands.filter(command => command instanceof Command)
		console.log(stripIndents`
			Registered ${slashCommands.length} commands: 
			${slashCommands.map(command => command.name).join(', ')}
		`)
		const contextMenus = commands.filter(command => command instanceof ContextMenu)
		console.log(stripIndents`
			Registered ${contextMenus.length} context menus: 
			${contextMenus.map(command => command.name).join(', ')}
		`)
	}).catch(console.error);
})