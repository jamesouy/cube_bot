//! anon_tags
//! Stores all anonymous tags for each Discord user temporarily

// use crate::db::{users, Users};
use sea_orm::{entity::prelude::*, QuerySelect, Selector, SelectGetableValue};

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