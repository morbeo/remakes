# Tiny Tenant

A browser remake of *Little Computer People* (Activision, 1985). A small person and their dog live in a three-floor house inside your computer. They look after themselves, pick up hobbies and write you letters. You can watch, talk to them and send parcels.

Open `index.html` in a browser. Everything is in that one file: the house and people are drawn in code, and all sound is synthesised.

## What's procedural

- **The tenant:** name, dog, looks, voice and personality traits all come from one seed, so every new tenant is different. Add `?seed=1234` to the URL to meet a specific one.
- **The house:** wallpaper, sofa and blanket colours, book spines and wall art come from the same seed.
- **Behaviour:** seven needs (food, water, energy, fun, cleanliness, company, health) run down over time. The tenant scores every activity by how much it helps their lowest needs, weighted by personality, and does the best one.
- **Letters:** written from templates, using their mood, what happened since the last letter and what they're short of.
- **Music:** each tenant has their own piano tunes, generated from the seed. They play wrong notes less as they practise.

## Controls

- **Type** to talk. They understand requests ("please play the piano", "watch tv", "feed the dog", "go to bed"), "my name is …", "how are you?" and a few more. Saying please helps; asking too often doesn't.
- **Tap the tenant** for a pat, tap the dog, the door (knock), the phone or the mailbox.
- **Knock / Phone** to get their attention. Waking them up does not go down well.
- **Play 21** for a hand of cards at the kitchen table.
- **Parcels:** groceries, dog food, books, records and tonic are left at the door, and the tenant opens them when they're free. If the fridge runs empty they get hungry and eventually ill.
- **Speed:** pause, 1× (one game minute per second), 4× or 15×.

The game saves to the browser's local storage. **New tenant** moves someone else in.
