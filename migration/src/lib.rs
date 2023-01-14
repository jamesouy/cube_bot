pub use sea_orm_migration::prelude::*;

mod m20230111_215131_create_anon_tags_table;
mod m20230111_215146_create_anon_muted_table;
mod m20230111_223717_create_users_table;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20230111_215131_create_anon_tags_table::Migration),
            Box::new(m20230111_215146_create_anon_muted_table::Migration),
            Box::new(m20230111_223717_create_users_table::Migration),
        ]
    }
}
