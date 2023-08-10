/* eslint-disable @typescript-eslint/no-unused-vars */
import fs = require("fs");
import path from "path";
import { LoggerInterface } from "./Logger";

interface KacheItem {
    expiration: number;
    comment: string;
    item: unknown;
}

export interface KacheStorage {
    [key: string]: KacheItem;
}

export interface KacheInterface {
    get(key: string): unknown;
    set(key: string, newItem: unknown, expirationTime: number): void;
}

export class Kache implements KacheInterface {
    private cacheStorage: KacheStorage; 
    private cacheName: string;
    private cachePath: string;

    private logger: LoggerInterface;

    constructor(logger: LoggerInterface, cacheName: string) {
        this.logger = logger;
        this.cacheName = cacheName;
        this.cachePath = path.resolve(__dirname, "..", this.cacheName);
        this.cacheStorage = {};

        try {
            const cacheData: Buffer | null | undefined = fs.readFileSync(this.cachePath);
            if (cacheData !== undefined && cacheData !== null) {
                this.logger.verbose(`Cache: Using: ${this.cacheName}`); // ${JSON.stringify(this.cacheStorage, null, 4)}`);
  
                this.cacheStorage = JSON.parse(cacheData.toString());

                for (const [key, value] of Object.entries(this.cacheStorage)) {
                    const cacheItem = this.cacheStorage[key];
        
                    if (cacheItem.expiration < new Date().getTime()) {
                        this.logger.info(`Cache load: '${key}' has expired, deleting`);
                        delete this.cacheStorage[key];
                    } else {
                        this.logger.verbose(`Cache load: '${key}' still good.`);
                    }
                }
            } else {
                this.logger.verbose(`Cache: Creating new: ${this.cacheName}`);
            }
        } catch (e) {
            this.logger.verbose(`Cache: Creating new: ${this.cacheName}`);
        }
    }

    public get(key: string): unknown {
        if (this.cacheStorage[key] !== undefined) {
            const cacheItem: KacheItem = this.cacheStorage[key as keyof KacheStorage];

            const expiration: number = cacheItem.expiration;
            const item: unknown    = cacheItem.item;

            const now = new Date();
            if (expiration > now.getTime()) {
                // object is current
                this.logger.verbose(`Cache: Key: '${key}' - cache hit`);
                return item;
            } else {
                // object expired
                this.logger.verbose(`Cache: Key: '${key}' - cache expired`);
            }
        } else {
            this.logger.verbose(`Cache: Key: '${key}' - cache miss`);
        }

        return null;
    }

    public set(key: string, newItem: unknown, expirationTime: number): void {
        const comment: string = new Date(expirationTime).toString();
        this.logger.verbose(`Cache set: Key: ${key}, exp: ${comment}`);

        const cacheItem = {expiration: expirationTime, comment: comment, item: newItem};
        this.cacheStorage[key as keyof KacheStorage] =  cacheItem;

        // Does this need to be synchronous?
        fs.writeFileSync(this.cachePath, JSON.stringify(this.cacheStorage, null, 4));
    }
}