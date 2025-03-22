from collections import defaultdict
import math
import matplotlib.pyplot as plt
import statistics

import scraper

reviews = scraper.load_json('reviews.js')


def test(r):
  try:
    positive = r['total_positive']
    total = r['total_reviews']
    actual_desc = r['review_score_desc']
  except KeyError:
    print(r)
    return
  expected_desc = get_rating(positive, total)
  if actual_desc != expected_desc:
    print(f'Expected {expected_desc}, Actual {actual_desc}, {positive} {total}')
  
def get_rating(positive, total):
  if total == 0:
    return 'No user reviews'
  elif total < 10:
    return f'{total} user reviews'
  
  perc = positive / total
  if total < 50:
    if perc >= 0.80:
      return 'Positive'
    elif perc >= 0.70:
      return 'Mostly Positive'
    elif perc >= 0.40:
      return 'Mixed'
    elif perc >= 0.20:
      return 'Mostly Negative'
    else:
      return 'Negative'
  elif total < 500:
    if perc >= 0.80:
      return 'Very Positive'
    elif perc >= 0.70:
      return 'Mostly Positive'
    elif perc >= 0.40:
      return 'Mixed'
    elif perc >= 0.20:
      return 'Mostly Negative'
    else:
      return 'Very Negative'
  else:
    if perc >= 0.95:
      return 'Overwhelmingly Positive'
    elif perc >= 0.80:
      return 'Very Positive'
    elif perc >= 0.70:
      return 'Mostly Positive'
    elif perc >= 0.40:
      return 'Mixed'
    elif perc >= 0.20:
      return 'Mostly Negative'
    else:
      return 'Overwhelmingly Negative'

#for r in reviews.values():
#  test(r)

#exit()

def analyze(r):
  positive = r.get('total_positive', 0)
  total = r.get('total_reviews', 0)
  if total == 0:
    return [0, 0, 0, 0, scraper.meets_score_threshold(positive, total)]
  perc = positive / total
  gemRating = perc - (perc - 0.5) * math.pow(2, -math.log10(total));
  return [total, positive, perc, gemRating, scraper.meets_score_threshold(positive, total)]

data = [analyze(r) for r in reviews.values()]
total = len(data)
data2 = [d for d in data if d[4]]
total3 = len(data2)
print('total3', total3 / total)

data = [d for d in data if d[3] >= 0.75] # Filter 1: >= 75% aggregated rating (85% reduction)
total2 = len(data)
print('total2', total2 / total)

data = [d for d in data if d[0] >= 500] # Filter 2: "non low rated" >= 500 total reviews (75% reduction)
total1 = len(data)
print(total1 / total2)
print(total1 / total) # Overall: 3% of data retained
"""
data = [d for d in data if d[0] < 100]
total = len(data)
data = [d[3] for d in data if d[3] > 0.66]
total3 = len(data)
print(total3 / total)
"""
exit()
# The data I'm trying to re-evaluate is this:
# isLowRated = perc < 0.80 or total < 500
# isHiddenGem = gemRating >= 0.80 and total < 500

# After some futsing, I think a flat gemRating > 0.66 and "hidden gem" threshold at (total >= 100) cuts the data to about 1/6th, which sounds like a reasonable size.
# idk. Made up some more numbers that I also feel meh about.

#print(statistics.mean(data))
#print(statistics.median(data))

# There are 90k games with 0 positive ratings
# There are 14k games with 1 positive rating
# There are 42k games with 2-10 positive ratings
# There are 44k games with 11-100 positive ratings
# There are 17k games with 101-1000 positive ratings
# There are 5k games with 1001-10000 positive ratings
# There are 1.5k games with >10000 positive ratings

# There are 85k games with 0 total ratings
# There are 13k games with 1 total rating
# There are 40k games with 2-10 total ratings
# There are 45k games with 11-100 total ratings
# There are 20k games with 101-1000 total ratings
# There are 6k games with 1001-10000 total ratings
# There are 1.6k games with >10000 total ratings

# There are 11,886 games with >= 500 total ratings
#print('More than 500 ratings:', sum((1 for d in data if d >= 500)))



plt.ecdf(data)
diagonal = [x / 100 for x in range(100)]
plt.scatter(diagonal, diagonal)
plt.show()
raise

counts = defaultdict(int)
for d in data:
  d = round(d, 2)
  if d == 0:
    continue
  counts[d] += 1

scatter_x = []
scatter_y = []
for k, v in counts.items():
  if v != 0:
    scatter_x.append(k)
    scatter_y.append(v)
    # plt.annotate((k, v), (k, v))

plt.scatter(scatter_x, scatter_y)

plt.show()

