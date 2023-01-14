//! Tables for anonymous users on Discord

pub mod anon_tags;
pub use anon_tags::Entity as AnonTags;
pub use anon_tags::SelectorUtils as AnonTagsSelector;

pub mod anon_muted;
pub use anon_muted::Entity as AnonMuted;
