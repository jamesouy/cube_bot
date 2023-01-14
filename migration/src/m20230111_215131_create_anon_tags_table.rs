//! Create table anon_tags
//! Stores Discord users' anonymous tags temporarily

use sea_orm_migration::prelude::*;

use crate::m20230111_223717_create_users_table::Users;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(AnonTags::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(AnonTags::Id).unsigned().not_null().primary_key().auto_increment())
                    .col(ColumnDef::new(AnonTags::DiscordUserId).string().not_null(),)
                    .col(ColumnDef::new(AnonTags::Tag).unsigned().not_null())
                    .col(ColumnDef::new(AnonTags::CreationDate).date_time().not_null(),)
                    // .foreign_key(
                    //     ForeignKey::create()
                    //         .name("fk-anon-user")
                    //         .from(AnonTags::Table, AnonTags::DiscordUserId)
                    //         .to(Users::Table, Users::DiscordUserId)
                    //         .on_delete(ForeignKeyAction::Cascade),
                    // )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(AnonTags::Table).to_owned())
            .await
    }
}

#[derive(Iden)]
pub enum AnonTags {
    Table,
    Id,
    DiscordUserId,
    Tag,
    CreationDate,
}
