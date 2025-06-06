cargo run --package shared --bin crux_cli --features cli -- \
    codegen --out-dir ./types \
        --typescript counter_types
