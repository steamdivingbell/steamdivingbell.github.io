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

This repo also contains the raw data files (in the `data/` folder), which have been download and/or scraped from Steam.
All the usual legally gray areas about scraping aside, please don't assume that I own any scraped data.

# An overview
This project is a web app that helps you find new games on steam. The basic idea is that you select one game, and diving bell will give you 8 recommendations (in a square around the selected game). You can hover those games to get some details, or you can click on one to "dive in", in which case the game you clicked becomes selected and 

## Extra features from the original
1. First and most importantly, I've updated the database with the latest games. You can see some statistics below, but it's a helluva lot bigger than the original 34,600 games from 2019. 
2. Secondly, the app is now capable of tag filtering. This helps further scope the massive list of games -- if you don't want to see horror games, you don't have to.
3. (More to come)


# Statistics
Total games in the database:  221377
Games with >10,000 reviews:   1716 (0.775148276469552 %)
Games with <75% review score: 189357 (85.53598612321967 %)

Last updated: 2025-04-12 23:16:33.491849
