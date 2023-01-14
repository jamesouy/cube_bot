//! anon_tags
//! Stores all anonymous tags for each Discord user temporarily

use crate::Error;
use chrono::{Duration, DurationRound, Utc};
use poise::serenity_prelude::UserId;
use rand::Rng;
use sea_orm::{entity::prelude::*, sea_query, QuerySelect, Selector, SelectGetableValue, DatabaseTransaction, ActiveValue::Set, QueryOrder};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "anon_tags")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: u32,
    pub discord_user_id: String,
    pub tag: u32,
    pub creation_date: DateTime,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    // #[sea_orm(
    //     belongs_to = "Users",
    //     from = "Column::DiscordUserId",
    //     to = "users::Column::DiscordUserId",
    //     on_update = "NoAction",
    //     on_delete = "Cascade"
    // )]
    // Users,
}

// impl Related<Users> for Entity {
//     fn to() -> RelationDef {
//         Relation::Users.def()
//     }
// }

impl ActiveModelBehavior for ActiveModel {}

#[derive(Copy, Clone, Debug, EnumIter, DeriveColumn)]
pub enum QueryAsTag {
    Tag,
}

pub trait SelectorUtils {
    /// Select only the tag column
    fn into_tag(self) -> Selector<SelectGetableValue<u32, QueryAsTag>>;
}

impl SelectorUtils for Select<Entity> {
    fn into_tag(self) -> Selector<SelectGetableValue<u32, QueryAsTag>> {
        self
            .select_only()
            .column(Column::Tag)
            .into_values()
    }
}


fn current_hour_filter() -> Result<sea_query::SimpleExpr, Error> {
    let hour_start = Utc::now().duration_trunc(Duration::hours(1))?.naive_utc();
    Ok(Column::CreationDate.gte(hour_start))
}
fn user_filter(user: UserId) -> sea_query::SimpleExpr {
    Column::DiscordUserId.eq(user.to_string())
}


impl Entity {
    /// Return the number of tags the user currently owns
    pub async fn count_tags(txn: &DatabaseTransaction, user: UserId) -> Result<u64, Error> {
        let count = Self::find()
            .filter(sea_query::all![current_hour_filter()?, user_filter(user)])
            .count(txn)
            .await?;
        Ok(count)
    }

    /// Gets the tag currently assigned to the user. Returns None if
    /// no tag has been generated for the user in the current hour yet
    pub async fn get_tag(txn: &DatabaseTransaction, user: UserId) -> Result<Option<u32>, Error> {
        let model = Self::find()
            .filter(sea_query::all![current_hour_filter()?, user_filter(user)])
            .order_by_desc(Column::CreationDate)
            .one(txn)
            .await?;
        Ok(model.map(|m| m.tag))
    }

    /// Generates a new tag for the user. Returns None if no more tags available
    pub async fn generate_tag(txn: &DatabaseTransaction, user: UserId) -> Result<Option<u32>, Error> {
        // Get current tags sorted
        let tags = Self::find()
            .filter(current_hour_filter()?)
            .order_by_asc(Column::Tag)
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
        Self::insert(ActiveModel {
            discord_user_id: Set(user.to_string()),
            tag: Set(random_tag),
            creation_date: Set(Utc::now().naive_utc()),
            ..Default::default()
        })
        .exec(txn)
        .await?;

        // Delete all tags except for last 20 (tags don't need to be stored forever)
        Self::delete_many()
            .filter(sea_query::all![
                user_filter(user),
                Column::Id.not_in_subquery(
                    sea_query::Query::select()
                        .column(Column::Id)
                        .order_by(Column::CreationDate, sea_query::Order::Desc)
                        .limit(20)
                        .from(Self)
                        .to_owned()
                )
            ])
            .exec(txn)
            .await?;

        Ok(Some(random_tag))
    }

}