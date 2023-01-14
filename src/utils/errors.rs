use async_trait::async_trait;
use sea_orm::TransactionTrait;

use crate::Error;

#[derive(thiserror::Error, Debug)]
#[error("UserError({0})")]
pub struct UserError(pub String);

macro_rules! user_error {
    ($($arg:tt)*) => {{
        let res = $crate::utils::errors::UserError(format!($($arg)*));
        anyhow!(res)
    }};
}
pub(crate) use user_error;

macro_rules! user_err {
    ($($arg:tt)*) => {{
        Err(crate::utils::errors::user_error!($($arg)*))
    }};
}
pub(crate) use user_err;


// /// Additional methods to make sea_orm work with anyhow errors
#[async_trait]
pub trait DatabaseAnyhow {
    async fn transaction_anyhow<F, T>(&self, callback: F) -> Result<T, Error>
    where
        F: for <'a> FnOnce(
                &'a sea_orm::DatabaseTransaction,
            ) -> core::pin::Pin<
                Box<dyn core::future::Future<Output = Result<T, Error>> + Send + 'a>,
            > + Send,
        T: Send;
}
#[async_trait]
impl DatabaseAnyhow for sea_orm::DatabaseConnection {
    async fn transaction_anyhow<F, T>(&self, callback: F) -> Result<T, Error>
    where
        F: for <'a> FnOnce(
                &'a sea_orm::DatabaseTransaction,
            ) -> core::pin::Pin<
                Box<dyn core::future::Future<Output = Result<T, Error>> + Send + 'a>,
            > + Send,
        T: Send,
    {
        // self.transaction::<_, _, &(dyn std::error::Error + Send + Sync)>(|txn| {
        //     Box::pin(async move { callback(txn).await.map_err(|err| &*err) })
        // })
        // .await.map_err(|err| anyhow!(err))
        let txn = self.begin().await?;
        match callback(&txn).await {
            Ok(v) => {
                txn.commit().await?;
                Ok(v)
            },
            Err(e) => Err(e),
        }
    }
}
