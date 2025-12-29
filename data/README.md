This folder contains information scraped from Steam and download from Steam's APIs. The copyright for the data is held by Valve Corporation, who created Steam and its APIs. Please don't take the files' presence in this repo as an implication that I own this data, or that you can claim ownership yourself.


- `app_details/<game_id>.json`: Contains the raw game data from steam for a particular game. This is often large, and we retain these even for deleted / low score games, so they're only loaded as needed (i.e. when you hover a game)
- `all_reviews.js`: Contains review scores for all game IDs.
- `deleted_games.js`: Contains the list of games which have been removed from the store, but whose IDs are still listed in this database.
- `game_names.js`: Contains the raw list of game names for all game IDs.
- `game_tags.js`: Contains the raw list of tag IDs for all game IDs.
- `header_images.js`: Some games' store image do not have the normal naming scheme. This file contains corrected image paths for those games.
- `pending_games.js`: Contains game IDs which are newly released (<1 week). Once 1 week is passed, data is pulled for these games at highest priority.
- `reviews.js`: Contains review scores for games which meet the score threshold. This file is used as the definitive list of "recommendable games".
- `similar_games.js`: Contains the direct (scraped) steam game recommendations.
- `tags.js`: Contains the categories for each tag ID.f