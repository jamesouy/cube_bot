import { stripIndents } from 'common-tags'
import { REST } from '@discordjs/rest'
import { Routes } from 'discord.js'
import * as dotenv from "dotenv"

import { getAllCommands } from './bot-framework/command';

dotenv.config()

getAllCommands().then(commands => {
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
	}).then(() => console.log(stripIndents`
		Registered ${commands.length} commands: 
		${commands.map(command => command.name).join(', ')}
	`)).catch(console.error);

})