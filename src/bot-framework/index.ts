export {
	Initializer,
	ConfigInitializer,
	getAllInitializers,
} from './initializer'

export {
	BaseCommand,
	Command,
	ContextMenu,
	Button,
	Modal,
	getAllCommands,
	getAllContextMenus,
	getAllButtons,
	getAllModals,
} from './interaction-listeners'


/** 
 * These errors are caused by user input and not by bugs in the program
 * When such an error happens, the bot will send the error message to the user
 * and not log the error to prevent flooding the log.
 * Set ephemeral to override the command's ephemeral setting
 */
 export class UserError extends Error {
	constructor(message?: string, readonly ephemeral?: boolean) {
		super(message)
		this.name = 'CubeUserError'
	}
}