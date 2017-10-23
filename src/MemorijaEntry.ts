export class MemorijaEntry<T> {
    private _value: T;
    private _expireAt: number;

    constructor(value: T, expireAt?: number) {
        this._value = value;
        this._expireAt = expireAt === undefined ? null : expireAt;
    }

    /**
     * Returns the value of the entry.
     *
     * @return {T}
     */
    get value(): T {
        return this._value;
    }

    /**
     * Returns the timestamp when this entry expires, or null if it never expires.
     *
     * @return {number}
     */
    get expireAt(): number | null {
        return this._expireAt;
    }

    /**
     * Returns the remaining time to live of this entry, in milliseconds, or null if the entry never expires.
     *
     * @return {number}
     */
    get ttl(): number | null {
        return this.expireAt === null ? null : this.expireAt - Date.now();
    }

    /**
     * Returns true if the entry's time to live has expired, otherwise false.
     *
     * @return {boolean}
     */
    get isExpired(): boolean {
        return (this.expireAt === null) ? false : (this.expireAt < Date.now());
    }
}
