// Provides abstractions for claiming anonymous tags for use on Discord.
// A tag is a unique number from 0000 to 9999. No two users can have the same tag at the same time.
// Tags are reset at the start of every hour.

use crate::{
    db::anon::{anon_tags, AnonTags, AnonTagsSelector},
    Error,
};
use chrono::{Duration, DurationRound, Utc};
use poise::serenity_prelude::UserId;
use rand::Rng;
use sea_orm::{prelude::*, sea_query, ActiveValue::*, DatabaseTransaction, QueryOrder};

fn current_hour_filter() -> Result<sea_query::SimpleExpr, Error> {
    let hour_start = Utc::now().duration_trunc(Duration::hours(1))?.naive_utc();
    Ok(anon_tags::Column::CreationDate.gte(hour_start))
}
fn user_filter(user: UserId) -> sea_query::SimpleExpr {
    anon_tags::Column::DiscordUserId.eq(user.to_string())
}

/// Return the number of tags the user currently owns
pub async fn count_tags(txn: &DatabaseTransaction, user: UserId) -> Result<u64, Error> {
    let count = AnonTags::find()
        .filter(sea_query::all![current_hour_filter()?, user_filter(user)])
        .count(txn)
        .await?;
    Ok(count)
}

/// Gets the tag currently assigned to the user. Returns None if
/// no tag has been generated for the user in the current hour yet
pub async fn get_tag(txn: &DatabaseTransaction, user: UserId) -> Result<Option<u32>, Error> {
    let model = AnonTags::find()
        .filter(sea_query::all![current_hour_filter()?, user_filter(user)])
        .order_by_desc(anon_tags::Column::CreationDate)
        .one(txn)
        .await?;
    Ok(model.map(|m| m.tag))
}

/// Generates a new tag for the user. Returns None if no more tags available
pub async fn generate_tag(txn: &DatabaseTransaction, user: UserId) -> Result<Option<u32>, Error> {
    // Get current tags sorted
    let tags = AnonTags::find()
        .filter(current_hour_filter()?)
        .order_by_asc(anon_tags::Column::Tag)
        .into_tag()
        .all(txn)
        .await?;

    // Generate random tag that isn't yet claimed
    let mut random_tag = rand::thread_rng().gen_range(0..10000u32);
    for tag in tags {
        if random_tag < tag {
            break;
        } else {
            random_tag += 1;
        }
    }
    if random_tag > 9999 {
        return Ok(None);
    }

    // Insert the new row
    AnonTags::insert(anon_tags::ActiveModel {
        id: NotSet,
        discord_user_id: Set(user.to_string()),
        tag: Set(random_tag),
        creation_date: Set(Utc::now().naive_utc()),
    })
    .exec(txn)
    .await?;

    // Delete all tags except for last 20 (tags don't need to be stored forever)
    let res = AnonTags::delete_many()
        .filter(sea_query::all![
            user_filter(user),
            anon_tags::Column::Id.not_in_subquery(
                sea_query::Query::select()
                    .column(anon_tags::Column::Id)
                    .order_by(anon_tags::Column::CreationDate, sea_query::Order::Desc)
                    .limit(20)
                    .from(AnonTags)
                    .to_owned()
            )
        ])
        .exec(txn)
        .await?;

    Ok(Some(random_tag))
}
