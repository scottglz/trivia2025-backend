import { getQuestions, analyze } from  './trivia-mafia-analyzer';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('trivia-mafia-analyzer', function() {
   describe('getQuestions', function() { 
      it('gets expected results', function() {
         const body = readFileSync(join(__dirname, '../specfiles/trivia-mafia-email-1.txt'), 'utf-8');
         expect(getQuestions(body)).toEqual([
            'Quit While You’re Ahead: The northeastern confederacy known as the Haudenosaunee, or the Iroquois, are made up of the Six Nations. Name as many of those tribes as you can for one point each. Zero total if you get any wrong.',
            'How many theses did Martin Luther nail to a church door in Wittenberg, Germany?',
            'A five-line poem written in anapestic trimeter with a rhyme scheme A-A-B-B-A is better known as a… what?',
            'Which U.S. state was home to more Civil War battles than any other state?',
            'Today is November 5. Born on this day in 1855, what founder of the International Workers of the World ran for president of the United States under the Socialist Party of America five times, getting 6% of the popular vote in 1912, and 3.4% in 1920, when he ran from prison after being convicted of sedition?'
         ]);
      });

      describe('analyze', function() { 
         it('gets expected results in a thursday (adds fridays\'s question)', function() {
            const body = readFileSync(join(__dirname, '../specfiles/trivia-mafia-email-1.txt'), 'utf-8');
            const date = Date.UTC(2021, 10, 4, 14, 0, 0); // Nov 4 -- thursday
            expect(analyze(date, body)).toEqual([{
               day: '2021-11-05',
               q: 'A five-line poem written in anapestic trimeter with a rhyme scheme A-A-B-B-A is better known as a… what?'
            }]);
         });

         it('gets expected results in a friday (adds saturday sunday monday tues wed questions)', function() {
            const body = readFileSync(join(__dirname, '../specfiles/trivia-mafia-email-1.txt'), 'utf-8');
            const date = Date.UTC(2021, 9, 29, 14, 0, 0); //Friday Oct 29
            expect(analyze(date, body)).toEqual([
                {
                  day: '2021-10-30',
                  q: 'A five-line poem written in anapestic trimeter with a rhyme scheme A-A-B-B-A is better known as a… what?'
               },
               {
                  day: '2021-10-31',
                  q: 'Which U.S. state was home to more Civil War battles than any other state?'
               },
               {
                  day: '2021-11-01',
                  q: 'How many theses did Martin Luther nail to a church door in Wittenberg, Germany?'
               },
               {
                  day: '2021-11-02',
                  q: 'Today is November 5. Born on this day in 1855, what founder of the International Workers of the World ran for president of the United States under the Socialist Party of America five times, getting 6% of the popular vote in 1912, and 3.4% in 1920, when he ran from prison after being convicted of sedition?'
               },
               {
                  day: '2021-11-03',
                  q:  'Quit While You’re Ahead: The northeastern confederacy known as the Haudenosaunee, or the Iroquois, are made up of the Six Nations. Name as many of those tribes as you can for one point each. Zero total if you get any wrong.'
               }
            ]);
         });
      });
   });
});

