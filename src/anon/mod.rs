/// anon: send messages anonymously to Discord channels

mod tags_registry;

mod anon;
pub use self::anon::anon;

mod anon_retag;
pub use self::anon_retag::anon_retag;