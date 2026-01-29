use crux_core::type_generation::facet::{Config, TypeRegistry};
use uniffi::deps::anyhow::Result;

use core::App;

fn main() -> Result<()> {
    let typegen_app = TypeRegistry::new().register_app::<App>().build();

    let config = Config::builder("core", "./types")
        .add_extensions()
        .add_runtimes()
        .build();

    typegen_app.typescript(&config)?;

    Ok(())
}
