cargo run --package core --bin crux_cli --features cli -- \
    codegen --out-dir ./types \
        --typescript core_types

# Remove js and d.ts files that could cause build problems
find ./types -name "*.d.ts" -o -name "*.js" -type f -delete
