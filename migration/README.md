# Running Migrator CLI

Package containing all database migration scripts. All pending migrations are automatically applied before the bot starts up. If you have `sea-orm-cli` installed, these commands can be run with `sea-orm-cli ...` instead of `cargo run -- ...`

- Generate a new migration file
    ```sh
    cargo run -- migrate generate <migration_name> --universal-time
    ```
- Generate entities
    ```sh
    cargo run -- generate entity --database-url <url> --output-dir <relative directory>
    ```
- Apply all pending migrations
    ```sh
    cargo run
    ```
    ```sh
    cargo run -- up
    ```
- Apply first 10 pending migrations
    ```sh
    cargo run -- up -n 10
    ```
- Rollback last applied migrations
    ```sh
    cargo run -- down
    ```
- Rollback last 10 applied migrations
    ```sh
    cargo run -- down -n 10
    ```
- Drop all tables from the database, then reapply all migrations
    ```sh
    cargo run -- fresh
    ```
- Rollback all applied migrations, then reapply all migrations
    ```sh
    cargo run -- refresh
    ```
- Rollback all applied migrations
    ```sh
    cargo run -- reset
    ```
- Check the status of all migrations
    ```sh
    cargo run -- status
    ```
