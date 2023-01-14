use crate::anon::tags_registry;
use crate::utils::errors::{user_error, DatabaseAnyhow};
use crate::{Context, Error};
use anyhow::{anyhow, bail, Result};

/// Generate a new tag to be displayed when sending anonymous messages
///
/// `/anon-retag` sends "hello" from a bot with a generated avatar and #tag.
/// Avatars and tags are reset at the end of every hour.
#[poise::command(slash_command)]
pub async fn anon_retag(ctx: Context<'_>) -> Result<(), Error> {
    ctx.defer_ephemeral().await?;

    // check ban
    // reset tags
    // check mute

    let user = ctx.author().id;
    let (prev_tag, new_tag) = ctx.data().database.transaction_anyhow(|txn| Box::pin(async move {
		let prev_tag = tags_registry::get_tag(txn, user).await?
			.ok_or(user_error!("You don't have a tag to reset! Send an anonymous message with /anon first."))?;
		if tags_registry::count_tags(txn, user).await? > 3 {
			bail!(user_error!("You have already retagged the maximum of 3 times this hour! Please wait until the next hour."));
		}
		let new_tag = tags_registry::generate_tag(txn, user).await?
			.ok_or(user_error!("No more anonymous tags available! Please wait until the next hour."))?;
		Ok((prev_tag, new_tag))
	})).await?;

    ctx.say(format!("Done: #{prev_tag:0>4} -> #{new_tag:0>4}"))
        .await?;
    Ok(())
}
