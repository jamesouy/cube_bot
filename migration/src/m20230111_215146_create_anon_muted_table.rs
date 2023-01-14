//! Create table anon_muted
//! Stores the Discord users currently muted from sending anonymous messages

// use crate::m20230111_223717_create_users_table::Users;
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(AnonMuted::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(AnonMuted::DiscordUserId).string().not_null().primary_key())
                    .col(ColumnDef::new(AnonMuted::EndDate).date_time())
                    .col(ColumnDef::new(AnonMuted::Reason).string())
                    // .foreign_key(
                    //     ForeignKey::create()
                    //         .name("fk-anon_muted-user")
                    //         .from(AnonMuted::Table, AnonMuted::DiscordUserId)
                    //         .to(Users::Table, Users::DiscordUserId)
                    //         .on_delete(ForeignKeyAction::Cascade),
                    // )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(AnonMuted::Table).to_owned())
            .await
    }
}

#[derive(Iden)]
pub enum AnonMuted {
    Table,
    DiscordUserId,
    EndDate,
    Reason,
}
