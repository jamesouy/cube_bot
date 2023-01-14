use crate::{Error, Context};
use async_trait::async_trait;
use poise::serenity_prelude::{RoleId, GuildId, Role, Http, GuildChannel, Webhook};
use anyhow::{Result, bail};



#[async_trait]
pub trait GuildUtils {
    async fn get_role(&self, http: &Http, id: RoleId) -> Result<Role, Error>;
}

#[async_trait]
impl GuildUtils for GuildId {
    async fn get_role(&self, http: &Http, id: RoleId) -> Result<Role, Error> {
		match self.roles(http).await?.get(&id) {
			Some(role) => Ok(role.clone()),
			None => bail!("Role with id '{id}' not found")
		}
	}
}

#[async_trait]
pub trait GuildChannelUtils {
	async fn get_webhook(&self, ctx: &Context) -> Result<Webhook, Error>;
}

#[async_trait]
impl GuildChannelUtils for GuildChannel {
	async fn get_webhook(&self, ctx: &Context) -> Result<Webhook, Error> {
		let mut cached_webhooks = ctx.data().webhooks.lock().await;
		if let Some(webhook) = cached_webhooks.get(&self.id) {
			Ok(webhook.clone())
		} else {
			let webhook = match self.webhooks(ctx).await?
				.iter().find(|w| w.token.is_some()) 
			{
				Some(w) => w.clone(),
				None => self.create_webhook(ctx, "CubeWebhook").await?,
			};
			cached_webhooks.insert(self.id, webhook.clone());
			Ok(webhook)
		}
	}
}