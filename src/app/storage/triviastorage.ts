import { userFull, QuestionWire } from '@scottglz/trivia2025-shared';

export interface TriviaStorage {
    getUsers: () => Promise<userFull[]>,
    createUser: (name: string, email: string, startday: string) => Promise<userFull>,
    startStopUser: (userid: number, day: string) => Promise<void>,
    getFullQuestions: (earliestDay: string, latestDay: string) => Promise<QuestionWire[]>,
    upsertQuestions: (questions: {day: string, q: string}[]) => Promise<void>,
    insertGuess: (day: string, userid: number, guess: string) => Promise<void>,
    insertAnswerAndGrades: (day: string, answer: string, grades: {correct: boolean, userid: number}[]) => Promise<void>,
    updateAnswer: (day: string, answer: string) => Promise<void>,
    updateGrade: (day: string, userid: number, correct: boolean) => Promise<void>,
    getComments: (day: string) => Promise<{day: string, userid: number, comment: string}[]>,
    insertComment: (day: string, userid: number, comment: string) => Promise<void>
 }