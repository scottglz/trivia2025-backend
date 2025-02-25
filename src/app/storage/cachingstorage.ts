import { TriviaStorage } from '.';

class CacheEntry<T> {
   readonly key: string[];
   promise: Promise<T>;

   constructor(key: string[], promise: Promise<T>) {
      this.key = key.slice();
      this.promise = promise;
   }
}

class FetchCache {
   entries = new Map<string, CacheEntry<unknown>>(); 
   
   accessData<T>(key: string[], fetcher: () => Promise<T>): Promise<T> {
      const mapKey = key.join('/');
      const entry = this.entries.get(mapKey);
      if (entry) {
         return entry.promise as Promise<T>;
      }
      console.log(`Fetching data for key ${mapKey}`);
      const promise = fetcher();
      const newEntry = new CacheEntry(key, promise);
      this.entries.set(mapKey, newEntry);
      return promise;
   }

   invalidate(keyStart: string) {
      for (const [mapKey, value] of this.entries) {
         if (value.key[0] === keyStart)
           this.entries.delete(mapKey);
       }
   }
}

class NotACache {
   accessData<T>(key: string[], fetcher: () => Promise<T>): Promise<T> {
      return fetcher();
   }

   invalidate(keyStart: string) {
      //  Empty
   }
}


export default class CachingStorage implements TriviaStorage {
   readonly storage: TriviaStorage;
   readonly usersCache = new FetchCache();
   readonly cache = new NotACache();

   constructor(storage: TriviaStorage) {
      this.storage = storage;
   }

   getUsers() {
      return this.usersCache.accessData(['users'], () => this.storage.getUsers());
   }

   async createUser(name: string, email: string, startday: string) {
      const newUser = await this.storage.createUser(name, email, startday);
      this.usersCache.invalidate('users');
      return newUser;
   }

   async startStopUser(userid: number, day: string) {
      await this.storage.startStopUser(userid, day);
      this.usersCache.invalidate('users');
   }

   getFullQuestions(earliestDay: string, latestDay: string) {
      return this.cache.accessData(['questions', earliestDay, latestDay], () =>
         this.storage.getFullQuestions(earliestDay, latestDay)
      );
   }

   async upsertQuestions(questions: { day: string; q: string; }[]) {
      await this.storage.upsertQuestions(questions);
      this.cache.invalidate('questions');
   }

   async insertGuess(day: string, userid: number, guess: string) {
      await this.storage.insertGuess(day, userid, guess);
      this.cache.invalidate('questions');
   }   
   
   async insertAnswerAndGrades(day: string, answer: string, grades: { correct: boolean; userid: number; }[]) {
      await this.storage.insertAnswerAndGrades(day, answer, grades);
      this.cache.invalidate('questions');
   }

   async updateAnswer(day: string, answer: string) {
      await this.storage.updateAnswer(day, answer);
      this.cache.invalidate('questions');
   }

   async updateGrade(day: string, userid: number, correct: boolean) {
      await this.storage.updateGrade(day, userid, correct);
      this.cache.invalidate('questions');
   }

   getComments(day: string) {
      return this.cache.accessData(['comments', day], () => this.storage.getComments(day));
   } 

   async insertComment(day: string, userid: number, comment: string) {
      this.storage.insertComment(day, userid, comment);
      this.cache.invalidate('comments');
   }
    
}