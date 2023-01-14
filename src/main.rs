use std::collections::HashMap;
use tokio::sync::Mutex;
use anyhow::Result;
use poise::serenity_prelude::{
    self as serenity, 
    ChannelId, 
    Webhook,
};
use migration::{Migrator, MigratorTrait};

use crate::utils::errors::UserError;

mod utils;
mod anon;
mod db;


pub struct Data {
    database: sea_orm::DatabaseConnection,
    webhooks: Mutex<HashMap<ChannelId, Webhook>>,
}
// type Error = Box<dyn std::error::Error + Send + Sync>;
type Error = anyhow::Error;
type Context<'a> = poise::Context<'a, Data, Error>;

async fn event_handler(
    _ctx: &serenity::Context, 
    event: &poise::Event<'_>,
    _framework: poise::FrameworkContext<'_, Data, Error>,
    _user_data: &Data,
) -> Result<(), Error> {
    match event {
        poise::Event::Ready { data_about_bot } => {
            println!("Logged in as @{}", data_about_bot.user.tag());
        },
        _ => {}
    }
    Ok(())
}


async fn error_handler(error: poise::FrameworkError<'_, Data, Error>) {
    match error {
        poise::FrameworkError::Command { error, ctx } => {
            if let Some(error) = error.downcast_ref::<UserError>() {
                if ctx.say(&error.0).await.is_err() {
                    println!("Could not send UserError during command '{}': {:?}", error, ctx.command());
                }
            } else {
                ctx.say("Oh no! Error encountered :(").await.ok();
                println!("Command '{}' returned error: {:?} {:#?}", ctx.command().name, error, error.backtrace());
            }
        }
        poise::FrameworkError::EventHandler { error, event, .. } => {
            println!("EventHandler returned error during {:?} event: {:?} {:#?}", event.name(), error, error.backtrace());
        }
        error => {
            if let Err(e) = poise::builtins::on_error(error).await {
                println!("Error while handling error: {}", e)
            }
        }
    }
}


#[tokio::main]
async fn main() {
    // connect to database
    let url = std::env::var("DATABASE_URL").expect("DATABASE_URL not found in the environment");
    let database = sea_orm::Database::connect(url).await.expect("Error connecting to database");
    Migrator::up(&database, None).await.expect("Error migrating database");

    // start bot
    let framework = poise::Framework::builder()
        .token(std::env::var("DISCORD_BOT_TOKEN").expect("DISCORD_BOT_TOKEN not found in the environment"))
        .intents(
            serenity::GatewayIntents::GUILD_MESSAGES | 
            serenity::GatewayIntents::DIRECT_MESSAGES | 
            serenity::GatewayIntents::MESSAGE_CONTENT |
            serenity::GatewayIntents::GUILD_MEMBERS |
            serenity::GatewayIntents::GUILDS
        )
        .options(poise::FrameworkOptions {
            commands: vec![anon::anon(), anon::anon_retag()],
            event_handler: |ctx, event, framework, user_data| {
                Box::pin(event_handler(ctx, event, framework, user_data))
            },
            on_error: |error| Box::pin(error_handler(error)),
            ..Default::default()
        })
        .setup(|ctx, _ready, framework| Box::pin(async move {
            poise::builtins::register_globally(ctx, &framework.options().commands).await?;
            Ok(Data {
                database,
                webhooks: Mutex::new(HashMap::new())
            })
        }));
    framework.run().await.expect("Error starting client!");
}
