type Constructor<T> = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new (...args: any[]): T;
};

export function is<T extends object>(
    value: object,
    type: Constructor<T>,
): value is T {
    return value.constructor === type;
}
