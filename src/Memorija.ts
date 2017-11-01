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

import { MemorijaEntry } from "./MemorijaEntry";

type RawEntry<V> = [number, V];

export class Memorija<K, V> implements Map<K, V> {
    private readonly map: Map<K, RawEntry<V>>;
    private readonly timers: WeakMap<RawEntry<V>, any>;

    constructor() {
        this.map = new Map();
        this.timers = new WeakMap();
    }

    /**
     * Returns the number of entries in the cache.
     *
     * @return {number}
     */
    get size(): number {
        return this.map.size;
    }

    /**
     * Returns the value associated with the key.
     *
     * @param {K} key
     * @return {V}
     */
    get (key: K): V {
        const result = this.getRawEntry(key);
        return (result === undefined) ? undefined : result[1];
    }

    /**
     * Returns a MemorijaEntry containing the TTL and the value associated with the specified key.
     *
     * @param {K} key
     * @return {MemorijaEntry<V>}
     */
    getEntry(key: K): MemorijaEntry<V> {
        const entry = this.getRawEntry(key);
        return (entry === undefined) ? undefined : new MemorijaEntry(entry[1], entry[0]);
    }

    /**
     * @param {K} key
     * @return {RawEntry<V>}
     * @private
     */
    private getRawEntry(key: K): RawEntry<V> {
        return this.map.get(key);
    }

    /**
     * Returns the remaining time to live for a key, or sets it.
     *
     * @param {K} key the key
     * @param {number=} ttl time to live in milliseconds, or null to make the key never expire
     * @return {number|null|undefined} the remaining time to live of the key in milliseconds, or null if TTL is not set,
     *                                 or undefined if the key does not exist
     */
    ttl(key: K, ttl?: number | null): number | null | undefined {
        const entry = this.getEntry(key);
        if (entry === undefined) return undefined;

        // getter mode
        if (ttl === undefined) {
            return entry.ttl;
        }

        // setter mode
        this.set(key, entry.value, ttl);

        return ttl;
    }

    /**
     * Returns the timestamp when the key expires, or sets it.
     *
     * @param {K} key the key
     * @param {number} expireAt the expiration timestamp, or null to make the key never expire
     * @return {number} the timestamp when the key expires, or null if not set, or undefined if the key does not exist
     */
    expireAt(key: K, expireAt?: number | null): number | null | undefined {
        const entry = this.getRawEntry(key);
        if (entry === undefined) return undefined;

        // getter mode
        if (expireAt === undefined) {
            return entry[0];
        }

        // setter mode
        if (expireAt === null) {
            this.set(key, entry[1]);
            return null;
        }

        this.set(key, entry[1], expireAt - Date.now());

        return expireAt;
    }

    /**
     * Stores a key-value pair in the cache.
     *
     * @param {K} key the key
     * @param {V} value the value
     * @param {number=} ttl how long in milliseconds should the key be stored
     * @return {Memorija<K,V>} the current instance of Memorija to use as fluent interface
     */
    set (key: K, value: V, ttl?: number): this {
        this.cancelTimerForKey(key);

        const expireAt = ttl !== undefined ? Date.now() + ttl : undefined;

        const entry: RawEntry<V> = [expireAt, value];
        this.map.set(key, entry);

        if (ttl !== undefined) {
            this.createTimer(key, entry, ttl);
        }

        return this;
    }

    /**
     * Returns a boolean asserting whether a value has been associated to the key in the cache or not.
     *
     * @param {K} key
     * @return {boolean} true if a value is associated to the key, otherwise false
     */
    has(key: K): boolean {
        return this.map.has(key);
    }

    /**
     * Returns true if an element in the cache existed and has been removed, or false if the element does not exist.
     *
     * @param {K} key
     * @return {boolean}
     */
    delete(key: K): boolean {
        this.cancelTimerForKey(key);
        return this.map.delete(key);
    }

    /**
     * Removes all key-value pairs from the cache.
     */
    clear(): void {
        this.cancelTimers();
        this.map.clear();
    }

    /**
     * Calls callbackFn once for each key-value pair present in the cache in insertion order.
     * If a thisArg parameter is provided to forEach, it will be used as the this value for each callback.
     *
     * @param {(value: V, key: K, map: Map<K, V>) => void} callbackfn
     * @param thisArg
     */
    forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void {
        const self = this;

        this.map.forEach((v, k) => {
            callbackfn(v[1], k, self);
        }, thisArg);
    }

    /**
     * Returns a new iterator that contains the keys for each element in the cache in insertion order.
     *
     * @return {IterableIterator<K>}
     */
    keys(): IterableIterator<K> {
        return this.map.keys();
    }

    /**
     * Returns a new iterator that contains the values for each element in the cache in insertion order.
     *
     * @return {IterableIterator<V>}
     */
    * values(): IterableIterator<V> {
        for (let v of this.map.values()) {
            yield v[1];
        }
    }

    /**
     * Returns a new iterator that contains an array of [key, value] for each element in the cache in insertion order.
     *
     * @return {IterableIterator<[K , V]>}
     */
    * entries(): IterableIterator<[K, V]> {
        for (let [k, v] of this.map) {
            yield [k, v[1]];
        }
    }

    /**
     * Returns a new iterator that contains an array of [key, value] for each element in the cache in insertion order.
     * The value is an instance of MemorijaEntry containing the TTL and the value of the entry.
     *
     * @return {IterableIterator<[K , MemorijaEntry<V>]>}
     */
    * fullEntries(): IterableIterator<[K, MemorijaEntry<V>]> {
        for (let [k, v] of this.map) {
            yield [k, new MemorijaEntry(v[1], v[0])];
        }
    }

    /**
     * Returns a new iterator that contains an array of values for each element in the cache in insertion order.
     * The values are instances of MemorijaEntry containing the TTL and the value of the entry.
     *
     * @return {IterableIterator<MemorijaEntry<V>>}
     */
    * fullValues(): IterableIterator<MemorijaEntry<V>> {
        for (let v of this.map.values()) {
            yield new MemorijaEntry(v[1], v[0]);
        }
    }

    [Symbol.toStringTag]: "Map";

    [Symbol.iterator](): IterableIterator<[K, V]> {
        return this.entries();
    }

    /**
     * @param {K} key
     * @param {RawEntry<V>} entry
     * @param {number} timeout
     * @private
     */
    private createTimer(key: K, entry: RawEntry<V>, timeout: number) {
        this.timers.set(entry, setTimeout(() => {
            this.timers.delete(entry);
            this.map.delete(key);
        }, timeout));
    }

    /**
     * @param {K} key
     * @private
     */
    private cancelTimerForKey(key: K): void {
        this.cancelTimerForRawEntry(this.getRawEntry(key));
    }

    /**
     * @param {RawEntry<V>} entry
     * @private
     */
    private cancelTimerForRawEntry(entry: RawEntry<V>): void {
        clearTimeout(this.timers.get(entry));
        this.timers.delete(entry);
    }

    /**
     * @private
     */
    private cancelTimers(): void {
        for (let v of this.map.values()) {
            this.cancelTimerForRawEntry(v);
        }
    }
}
