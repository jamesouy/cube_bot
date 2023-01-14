//! `SeaORM` Entity. Generated by sea-orm-codegen 0.10.6

// use super::anon::{AnonMuted, AnonTags};
use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "users")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: String,
    pub discord_user_id: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    // #[sea_orm(has_one = "AnonMuted")]
    // AnonMuted,
    // #[sea_orm(has_many = "AnonTags")]
    // AnonTags,
}

// impl Related<AnonMuted> for Entity {
//     fn to() -> RelationDef {
//         Relation::AnonMuted.def()
//     }
// }

// impl Related<AnonTags> for Entity {
//     fn to() -> RelationDef {
//         Relation::AnonTags.def()
//     }
// }

impl ActiveModelBehavior for ActiveModel {}