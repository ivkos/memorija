/*
 * Copyright 2017 Ivaylo Stoyanov <me@ivkos.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export class MemorijaEntry<T> {
    private readonly _value: T;
    private readonly _expireAt: number;

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
