from collections import defaultdict
import math
import matplotlib.pyplot as plt
import statistics

import scraper

similar_games = scraper.load_json('similar_games.js')
for game in similar_games:
  similar_games[game] = ','.join(similar_games[game][:10])
scraper.dump_js(similar_games, 'similar_games.js')

data = [len(games) for games in similar_games.values()]

counts = defaultdict(int)
for d in data:
  counts[d] += 1

scatter_x = []
scatter_y = []
for k, v in counts.items():
  if v != 0:
    scatter_x.append(k)
    scatter_y.append(v)
    plt.annotate((k, v), (k, v))

plt.scatter(scatter_x, scatter_y)

plt.show()

