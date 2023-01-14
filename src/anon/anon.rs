use crate::db::anon::AnonTags;
use crate::utils::discord::channel::{GuildChannelUtils, GuildUtils};
use crate::utils::errors::{user_err, user_error, DatabaseAnyhow};
use crate::{Context, Error};
use anyhow::{anyhow, Result};
use poise::serenity_prelude::{CacheHttp, GuildChannel, RoleId};
use regex::Regex;

/// Replaces mentions that the author does not have permissions to use with @name#tag
async fn replace_mentions(
    mut message: String,
    ctx: &Context<'_>,
    channel: &GuildChannel,
) -> Result<String, Error> {
    let member = ctx
        .author_member()
        .await
        .ok_or(anyhow!("Unable to find author member"))?;
    let guild = ctx.guild().ok_or(anyhow!("Unable to find guild"))?;
    if !guild
        .user_permissions_in(&channel, member.as_ref())?
        .mention_everyone()
    {
        // https://stackoverflow.com/questions/61552288/how-can-i-handle-this-error-in-closure-right-in-rust
        let role_regex = Regex::new(r"<@&(\d+)>").unwrap();
        let mut new_message = String::new();
        let mut last = 0;
        for caps in role_regex.captures_iter(&message) {
            let cap = caps.get(0).unwrap();

            let mut mention = String::from(cap.as_str());
            if let Ok(id) = caps[0].parse::<u64>() {
                if let Ok(role) = channel.guild_id.get_role(ctx.http(), RoleId(id)).await {
                    if role.mentionable {
                        mention = format!("@{}", role.name);
                    }
                }
            }

            new_message.push_str(&message[last..cap.start()]);
            new_message.push_str(&mention);
            last = cap.end();
        }
        message = new_message;
    }

    let mention_regex = Regex::new(r"<@[&!]?(\d+)>").unwrap();
    if mention_regex.captures_iter(&message).count() > 8 {
        user_err!("Too many mentions! You may send at most 8 role or user mentions in an anonymous message")
    } else if message.len() > 2000 {
        user_err!(
            "Message is too long! This could be caused by some mentions. ({}/2000 characters)",
            message.len()
        )
    } else {
        Ok(message)
    }
}

/// Send a message anonymously to the current channel
///
/// `/anon hello` sends "hello" from a bot with a generated avatar and #tag.
/// Avatars and tags are reset at the end of every hour.
#[poise::command(slash_command, guild_only, required_permissions = "SEND_MESSAGES")]
pub async fn anon(
    ctx: Context<'_>,
    #[description = "The message to send"] mut message: String,
) -> Result<(), Error> {
    ctx.defer_ephemeral().await?;

    // check ban
    // reset tags
    // check mute

    let channel = ctx
        .channel_id()
        .to_channel(ctx)
        .await?
        .guild()
        .ok_or(anyhow!("Unable to find channel"))?;
    message = replace_mentions(message, &ctx, &channel).await?;

    let user = ctx.author().id;
    let tag = ctx
        .data()
        .database
        .transaction_anyhow(|txn| {
            Box::pin(async move {
                match AnonTags::get_tag(txn, user).await? {
                    Some(tag) => Ok(Some(tag)),
                    None => AnonTags::generate_tag(txn, user).await,
                }
            })
        })
        .await?
        .ok_or(user_error!(
            "No more anonymous tags available! Please wait until the next hour."
        ))?;

    channel.get_webhook(&ctx).await?.execute(ctx, true, |w| w
		.username(format!("Anonymous#{tag:0>4}"))
		.avatar_url(format!("https://i.pickadummy.com/index.php?imgsize=128&w=5994a6&contrast=1&cache={tag}"))
		.content(message)
	).await.or(user_err!("Could not send webhook. Please try again later or contact a moderator."))?;

    ctx.say("Sent!").await?;
    Ok(())
}
