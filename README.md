# CubeBot™

Official Discord bot for the Anime Club at UT Austin!

## Installation

Before starting, make sure you have installed node.js, npm, and typescript. After cloning the repo, navigate into the project root directory and run:
```
npm install
```

Next, create a new file called `.env` in the root directory, with the following contents: 
```
GUILD_ID=[guild id here]
CLIENT_ID=[bot application id here]
BOT_TOKEN=[bot token here]
```
check out the [discord.js guide](https://discordjs.guide/preparations/setting-up-a-bot-application.html) for how to obtain some of these values. Do note that **the bot should only be added to one server**, or it might break.

Finally, rename the directory `config-templates` to `config`, and you're good to go!

## Running the Bot

First, make sure you have built the project by running:
```
tsc
```

To start the bot, run: 
```
npm start
```
