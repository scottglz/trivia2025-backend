"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class CacheEntry {
    key;
    promise;
    constructor(key, promise) {
        this.key = key.slice();
        this.promise = promise;
    }
}
class FetchCache {
    entries = new Map();
    accessData(key, fetcher) {
        const mapKey = key.join('/');
        const entry = this.entries.get(mapKey);
        if (entry) {
            return entry.promise;
        }
        console.log(`Fetching data for key ${mapKey}`);
        const promise = fetcher();
        const newEntry = new CacheEntry(key, promise);
        this.entries.set(mapKey, newEntry);
        return promise;
    }
    invalidate(keyStart) {
        for (const [mapKey, value] of this.entries) {
            if (value.key[0] === keyStart)
                this.entries.delete(mapKey);
        }
    }
}
class NotACache {
    accessData(key, fetcher) {
        return fetcher();
    }
    invalidate(keyStart) {
        //  Empty
    }
}
class CachingStorage {
    storage;
    usersCache = new FetchCache();
    cache = new NotACache();
    constructor(storage) {
        this.storage = storage;
    }
    getUsers() {
        return this.usersCache.accessData(['users'], () => this.storage.getUsers());
    }
    async createUser(name, email, startday) {
        const newUser = await this.storage.createUser(name, email, startday);
        this.usersCache.invalidate('users');
        return newUser;
    }
    async startStopUser(userid, day) {
        await this.storage.startStopUser(userid, day);
        this.usersCache.invalidate('users');
    }
    getFullQuestions(earliestDay, latestDay) {
        return this.cache.accessData(['questions', earliestDay, latestDay], () => this.storage.getFullQuestions(earliestDay, latestDay));
    }
    async upsertQuestions(questions) {
        await this.storage.upsertQuestions(questions);
        this.cache.invalidate('questions');
    }
    async insertGuess(day, userid, guess) {
        await this.storage.insertGuess(day, userid, guess);
        this.cache.invalidate('questions');
    }
    async insertAnswerAndGrades(day, answer, grades) {
        await this.storage.insertAnswerAndGrades(day, answer, grades);
        this.cache.invalidate('questions');
    }
    async updateAnswer(day, answer) {
        await this.storage.updateAnswer(day, answer);
        this.cache.invalidate('questions');
    }
    async updateGrade(day, userid, correct) {
        await this.storage.updateGrade(day, userid, correct);
        this.cache.invalidate('questions');
    }
    getComments(day) {
        return this.cache.accessData(['comments', day], () => this.storage.getComments(day));
    }
    async insertComment(day, userid, comment) {
        this.storage.insertComment(day, userid, comment);
        this.cache.invalidate('comments');
    }
}
exports.default = CachingStorage;
