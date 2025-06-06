cargo run --package shared --bin crux_cli --features cli -- \
    codegen --out-dir ./types \
        --typescript counter_types

find ./types -name "*.ts" \! \( -name "*.d.ts" \) -type f -delete
