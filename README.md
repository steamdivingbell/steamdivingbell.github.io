# Steam Diving Bell (revitalized)

This is a fork of the semi-functional-but-eventually-deprecated [steam diving bell](https://github.com/larsiusprime/divingbell) project.

I have taken the original source code (and done some heavy reading of [the literature](https://www.fortressofdoors.com/steam-diving-bell)) and done my best to recreate this project in a semi-functional form.

The current state of this project is:
- [ ] Not working
- [ ] Barely functional
- [ ] Functional
- [ ] Feature parity
- [X] Extended development
- [ ] EOL

# License

Much like the original, this code is under the MIT license -- see [the license](https://github.com/jbzdarkid/divingbell/blob/master/LICENSE.md) for details.

This repo relies on data which has been download and/or scraped from Steam.
Please don't assume that I own any scraped data. Please don't re-use the data *from* this repo -- I've provided my [scraping script](data/scraper.py) for anyone who wants to replicate my work.

# An overview
This project is a web app that helps you find new games on steam. The basic idea is that you select one game, and diving bell will give you 8 recommendations (in a square around the selected game). You can hover those games to get some details, or you can click on one to "dive in", in which case the game you clicked becomes selected and the process repeats.

## Extra features from the original
1. I've updated the database with the latest games. You can see some statistics below -- in the end, I had to filter down the games to get something that still gave reasonable suggestions.
2. The app is now capable of tag filtering. This helps further scope the massive list of games -- if you don't want to see horror games, you don't have to.
3. (more to come)
<!-- The app is now HTML-native so it is more accessible and reactive to other layouts (i.e. mobile) -->
<!-- Once I have the 'new' filter working, that should go here too -->




# Statistics
```
Total games in the database:  258261
Games with >10,000 reviews:   1952 (0.7558245340953531 %)
Games with >75% review score: 37301 (14.443140853632565 %)

Last updated: 2026-04-01 03:59:08.422342
```
