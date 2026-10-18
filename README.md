# Neno 🇹🇿

[**🔴 CHEZA HAPA (PLAY HERE)**](https://scoresby13.github.io/neno/)

**Neno** ("Word") is a Swahili version of the popular word puzzle game Wordle.

<img width="934" height="927" alt="image" src="https://github.com/user-attachments/assets/00322a27-affd-4ef7-ac95-dfb6ea5cb6ae" />

<img width="854" height="944" alt="image" src="https://github.com/user-attachments/assets/e6790e0c-71e9-4b0d-9ac5-b451f3b96eef" />

## Jinsi ya Kucheza (How to Play)
Bashiri **NENO** la herufi 5 katika majaribio 6.
- 🟩 **Green**: Herufi sahihi na ipo mahali sahihi.
- 🟨 **Yellow**: Herufi ipo lakini mahali sio sahihi.
- ⬜ **Gray**: Herufi haipo kabisa.

## Features
- **Daily Challenge**: A new word every day for everyone, changing at midnight East Africa Time.
- **Unlimited Mode**: Play as much as you want after the daily challenge.
- **Statistics**: Games played, win %, streaks, and guess distribution (📊).
- **Common-Word Answers**: Answers come from a hand-picked list of everyday words (`answers.js`), while any word in the full dictionary (`words.js`) is accepted as a guess.
- **Meanings**: The English meaning of each answer is shown after the game.
- **Hard Mode**: Any revealed hints must be used in later guesses (⚙️).
- **Light Theme & High Contrast**: Light colours, and orange/blue tiles for colour-blind players (⚙️).
- **Swahili Keyboard**: No Q or X, since Swahili doesn't use them.
- **Share**: Share your results with emoji grids (🟩🟨⬜).
- **Definitions**: Learn the meaning of the word via Google Search integration.

## Adding Answers
`answers.js` is the daily schedule: each day uses the next word in the list. Add new words (with their meaning) at the **end** of the list, and don't reorder or delete entries, so past and upcoming daily words stay the same. Every answer must also be in `words.js`.

## Technologies
Built with pure HTML, CSS, and JavaScript. No build steps required.

## Credits
Based on the original Wordle game.
Swahili word list sourced from [michaelnjuguna/All-swahili-words-dictionary](https://github.com/michaelnjuguna/All-swahili-words-dictionary).
