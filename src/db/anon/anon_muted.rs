//! anon_muted
//! Stores the Discord users that are currently muted from sending anonymous messages

// use crate::db::{users, Users};
use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "anon_muted")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub discord_user_id: String,
    pub end_date: Option<DateTime>,
    pub reason: Option<String>,
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
