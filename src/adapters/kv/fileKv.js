import { mkdir, readFile, unlink, rename, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

export class FileKVAdapter {
    constructor({ dir }) {
        if (!dir) throw new Error('FileKVAdapter requires a directory path');
        this.dir = dir;
        this._ready = this._init();
    }

    async _init() {
        await mkdir(this.dir, { recursive: true });
    }

    _encodeKey(key) {
        return Buffer.from(key).toString('base64url');
    }

    _filePath(key) {
        return join(this.dir, this._encodeKey(key));
    }

    async get(key) {
        await this._ready;
        const filePath = this._filePath(key);
        let raw;
        try {
            raw = await readFile(filePath, 'utf-8');
        } catch (err) {
            if (err.code === 'ENOENT') return null;
            throw err;
        }
        const entry = JSON.parse(raw);
        if (entry.expiresAt && Date.now() > entry.expiresAt) {
            await unlink(filePath).catch(() => {});
            return null;
        }
        return entry.value;
    }

    async put(key, value, options = {}) {
        await this._ready;
        const entry = { value };
        if (options.expirationTtl && options.expirationTtl > 0) {
            entry.expiresAt = Date.now() + options.expirationTtl * 1000;
        }
        const filePath = this._filePath(key);
        const tmpPath = `${filePath}.${randomUUID()}.tmp`;
        await writeFile(tmpPath, JSON.stringify(entry), 'utf-8');
        await rename(tmpPath, filePath);
    }

    async delete(key) {
        await this._ready;
        const filePath = this._filePath(key);
        try {
            await unlink(filePath);
        } catch (err) {
            if (err.code !== 'ENOENT') throw err;
        }
    }

    async cleanupExpired() {
        await this._ready;
        const entries = await readdir(this.dir);
        const now = Date.now();
        for (const name of entries) {
            if (name.endsWith('.tmp')) {
                await unlink(join(this.dir, name)).catch(() => {});
                continue;
            }
            const filePath = join(this.dir, name);
            try {
                const raw = await readFile(filePath, 'utf-8');
                const entry = JSON.parse(raw);
                if (entry.expiresAt && now > entry.expiresAt) {
                    await unlink(filePath).catch(() => {});
                }
            } catch {
            }
        }
    }
}
