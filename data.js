var globalGameData = new Map()
var globalRatingData = new Map()
var globalTagData = new Map()

// Based on my analysis from 200k games, as of 2025-03-22
function getReviewScoreDescription(positive, total) {
  if (total == 0) return 'No user reviews'
  if (total < 10) return total + ' user reviews'
  
  var perc = positive / total
  if (total < 50) {
    if (perc >= 0.80) return 'Positive'
    if (perc >= 0.70) return 'Mostly Positive'
    if (perc >= 0.40) return 'Mixed'
    if (perc >= 0.20) return 'Mostly Negative'
    return 'Negative'
  } else if (total < 500) {
    if (perc >= 0.80) return 'Very Positive'
    if (perc >= 0.70) return 'Mostly Positive'
    if (perc >= 0.40) return 'Mixed'
    if (perc >= 0.20) return 'Mostly Negative'
    return 'Very Negative'
  } else {
    if (perc >= 0.95) return 'Overwhelmingly Positive'
    if (perc >= 0.80) return 'Very Positive'
    if (perc >= 0.70) return 'Mostly Positive'
    if (perc >= 0.40) return 'Mixed'
    if (perc >= 0.20) return 'Mostly Negative'
    return 'Overwhelmingly Negative'
  }
}

window.loadDataFiles = function() {
  // We use 'games with reviews' as our master list of valid games.
  for (var gameId in window.reviews) {
    globalGameData.set(gameId, {
      'name': window.game_names[gameId],
      'tags': new Set(window.game_tags[gameId]),
    })
  }

  for (var gameId in window.reviews) {
    var data = window.reviews[gameId]

    // Secondary rating which is more fair for sparsely-rated games
    // See https://steamdb.info/blog/steamdb-rating
    var total = data.total
    var perc = 0.5
    var gemRating = 0.5 // Default values in case of 0 total votes (shouldn't happen; we filter this stuff out)
    if (total > 0) {
      perc = data.positive / total
      gemRating = perc - (perc - 0.5) * Math.pow(2, -Math.log10(total));
    }
    
    var desc = getReviewScoreDescription(data.positive, data.total)
    globalRatingData.set(gameId, {
      'ratingText': `${desc} (${Math.trunc(100 * perc)}% — ${total} ratings)`,
      'sortKey': gemRating,
      'isLowRated': perc < 0.80 || total < 500,
      'isHiddenGem': gemRating >= 0.80 && total < 500,
    })
  }

  // TODO: There are definitely more categories we should weight now.
  var CATEGORY_WEIGHTS = {'subgenre': 4, 'viewpoint': 3, 'theme': 2, 'players': 2, 'feature': 2, 'time': 2, 'story': 2, 'genre': 2}

  for (var tag in window.tags) {
    var categories = window.tags[tag].categories || []

    // Tags are associated with their heaviest category
    var bestCategory = null
    var bestWeight = 0
    for (var category of categories) {
      var categoryWeight = CATEGORY_WEIGHTS[category] || 1
      if (categoryWeight > bestWeight) {
        bestWeight = categoryWeight
        bestCategory = category
      }
    }

    globalTagData.set(tag, {
      'name': window.tags[tag].name,
      'weight': bestWeight,
      'category': bestCategory,
      'isWeak': categories.includes('weak'),
    })
  }

  // We do some filtering while scraping data to reduce the overall size of the database (and to avoid showing nonsense games)
  // Specifically, we exclude:
  // - Games which are part of a bundle
  // - Games which are DLC or demos
  // - Games with 0 reviews
  // - Games with <10,000 reviews that are rated poorly (gem score < 75%)
  // Those games will not be present in the globalRatingData (although they may be present in other listings).
  for (var game of Array.from(globalGameData.keys())) {
    if (!globalRatingData.has(game)) globalGameData.delete(game)
  }
}

var PRICE_FORMAT = new Intl.NumberFormat({}, {'style': 'currency', 'currency': 'USD'})
var DATE_FORMAT = new Intl.DateTimeFormat({}, {'dateStyle': 'long'})
function loadGameDetails(gameId) {
  return fetch(`data/app_details/${gameId}.json`)
  .then(r => r.json())
  .then(r => {
    var gameDetails = {
      'description': '',
      'price': 'Unknown',
      'tags': [],
      'genres': [],
      'platforms': [],
      'categories': [],
      'screenshots': [],
      'video': null,
    }
    // The description is HTML-escaped, so we need to unescape it.
    var pseudoHtml = '<div>' + r.short_description + '</div>'
    gameDetails.description = new DOMParser().parseFromString(pseudoHtml, 'text/html').documentElement.textContent;

    if (r.genres != null) gameDetails.genres = r.genres.map(g => g.description)
    if (r.categories != null) gameDetails.categories = r.categories.map(c => c.description)
    if (r.screenshots != null) gameDetails.screenshots = r.screenshots.map(s => s.path_full.replace('http://', 'https://'))

    if (window.game_tags[gameId] != null) {
      gameDetails.tags = window.game_tags[gameId].map(tag => globalTagData.get(tag).name)
    }

    if (r.is_free) gameDetails.price = 'Free'
    else if (r.price_overview != null) gameDetails.price = PRICE_FORMAT.format(r.price_overview.initial / 100.0)

    if (r.platforms.windows) gameDetails.platforms.push('Windows')
    if (r.platforms.mac)     gameDetails.platforms.push('Mac')
    if (r.platforms.linux)   gameDetails.platforms.push('Linux')

    if (r.movies != null && r.movies.length > 0) gameDetails['video'] = r.movies[0].webm.max.replace('http://', 'https://')

    if (r.release_date != null) gameDetails.releaseDate = DATE_FORMAT.format(new Date(r.release_date.date))

    return gameDetails
  })
}