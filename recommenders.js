// My version of chrome is very old. These should be removed, probably. At some point.
Set.prototype.union = Set.prototype.union || function(other) {
  var output = new Set(this)
  for (var elem of other) output.add(elem)
  return output
}

Set.prototype.intersection = Set.prototype.intersection || function(other) {
  var output = new Set()
  for (var elem of other) {
    if (this.has(elem)) output.add(elem)
  }
  return output
}

Set.prototype.difference = Set.prototype.difference || function(other) {
  var output = new Set()
  for (var elem of this) {
    if (!other.has(elem)) output.add(elem)
  }
  return output
}

// "Default" matches, directly from steam's "more like this" recommendations
function default_matches(baseGameId) {
  return window.similar_games[baseGameId].split(',')
}

// "Reverse" is just "more like this" but inverse-lookup, which we have already indexed
function reverse_matches(baseGameId) {
  var games = []
  for (var gameId in window.similar_games) {
    if (!globalRatingData.has(gameId)) continue // TODO: Incomplete data
    if (globalRatingData.get(gameId).isLowRated) continue // Don't recommend poorly-rated games
    if (window.similar_games[gameId].split(',').includes(baseGameId)) games.push(gameId)
  }
  return sort_games_by_tags(games, baseGameId)
}

// "Loose" is a 2x 'default' match, excluding the default matches themselves.
function loose_matches(baseGameId) {
  var siblings = window.similar_games[baseGameId].split(',')
  var games = new Set()

  // Add all second-generation siblings, if they're not immediate siblings and also not us.
  for (var sibling of siblings) {
    if (!globalRatingData.has(sibling)) continue // TODO: Incomplete data
    var grandSiblings = window.similar_games[sibling].split(',')
    for (var grandSibling of grandSiblings) {
      if (grandSibling == baseGameId) continue // Don't recommend ourselves
      if (siblings.includes(grandSibling)) continue // Don't recommend immediate siblings
      if (!globalRatingData.has(grandSibling)) continue // TODO: Incomplete data
      if (globalRatingData.get(grandSibling).isLowRated) continue // Don't recommend poorly-rated games
      games.add(grandSibling)
    }
  }

  return sort_games_by_tags(Array.from(games), baseGameId)
}

// These were the original 'culledTags', although I might change them at some point.
var REQUIRED_CATEGORY_MATCHES = new Set(['genre', 'theme', 'viewpoint', 'rpg'])

// "Tags" matches games based solely on % of matching steam tags.
// However, we only want to recommend similar games, so we require matching tags in some overall categories.
function tag_matches(baseGameId) {
  var requiredTags = new Set()
  var requiredCategories = new Set()
  for (var tagId of globalGameData.get(baseGameId).tags) {
    var tagData = globalTagData.get(tagId)
    if (tagData.isWeak) continue
    if (REQUIRED_CATEGORY_MATCHES.has(tagData.category)) {
      requiredTags.add(tagId)
      requiredCategories.add(tagData.category)
    }
  }

  var games = []
  for (var [gameId, data] of globalGameData.entries()) {
    if (gameId == baseGameId) continue // Don't recommend the current game
    if (globalRatingData.get(gameId).isLowRated) continue // Don't recommend poorly-rated games

    // Ensure that this game matches at least one tag in each category
    var missingCategories = new Set(requiredCategories)
    for (var tagId of data.tags) {
      if (requiredTags.has(tagId)) {
        missingCategories.delete(globalTagData.get(tagId).category)
        if (missingCategories.size === 0) break
      }
    }
    if (missingCategories.size === 0) games.push(gameId)
  }

  return sort_games_by_tags(games, baseGameId)
}

// "Hidden gems" is the tags matcher but only for games above some % rating and below some # total ratings. Not sure what those numbers are, yet.
function gem_matches(baseGameId) {
  var games = []
  for (var [gameId, data] of globalRatingData.entries()) {
    if (gameId == baseGameId) continue // Don't recommend the current game
    if (data.isHiddenGem) games.push(gameId)
  }

  return sort_games_by_tags(games, baseGameId)
}

function top_games() {
  // Order games by adjusted gem rating, ignoring games with <500 reviews
  var games = []
  for (var [gameId, data] of window.globalRatingData.entries()) {
    if (!data.isLowRated) games.push(gameId)
  }
  games.sort((a, b) => Math.sign(window.globalRatingData.get(b).sortKey - window.globalRatingData.get(a).sortKey))
  return games
}


// Used in many places for tie breaks, also used directly for the tag recommender
function sort_games_by_tags(games, baseGameId) {
  // Inverse sort so that the largest numbers (highest matches) are topmost. Ties broken by adjusted positive rating.
  games.sort((a, b) =>
    Math.sign(compare_candidates(baseGameId, b) - compare_candidates(baseGameId, a))
    || Math.sign(globalRatingData.get(b).sortKey - globalRatingData.get(a).sortKey))
  return games
}

function compare_candidates(gameA, gameB) {
  var tagsA = globalGameData.get(gameA).tags
  var tagsB = globalGameData.get(gameB).tags

  var totalWeight = 0
  for (var tag of tagsA.union(tagsB)) {
    totalWeight += globalTagData.get(tag).weight
  }

  var matchWeight = 0
  for (var tag of tagsA.intersection(tagsB)) {
    matchWeight += globalTagData.get(tag).weight
  }

  return matchWeight / totalWeight
}

function compare_candidates_verbose(gameA, gameB) {
  var tagsA = globalGameData.get(gameA).tags
  var tagsB = globalGameData.get(gameB).tags
  var tagData = new Map()

  var totalWeight = 0
  for (var tag of tagsA.union(tagsB)) {
    totalWeight += globalTagData.get(tag).weight
    var category = globalTagData.get(tag).category
    if (category != null && !tagData.has(category)) tagData.set(category, {'weight': 0, 'tags': []})
  }

  var matchWeight = 0
  for (var tag of tagsA.intersection(tagsB)) {
    matchWeight += globalTagData.get(tag).weight
    var category = globalTagData.get(tag).category
    if (tagData.has(category)) {
      tagData.get(category).weight += globalTagData.get(tag).weight
      tagData.get(category).tags.push(globalTagData.get(tag).name)
    }
  }

  // Sort largest categories first, then alphabetical
  var categories = Array.from(tagData.keys())
  categories.sort((a, b) => Math.sign(tagData.get(b).weight - tagData.get(a).weight) || a.localeCompare(b))

  var description = ''
  for (var category of categories) {
    if (tagData.get(category).weight == 0) continue
    tagData.get(category).tags.sort((a, b) => a.localeCompare(b))
    description += `+${tagData.get(category).weight} for ${category}: ${tagData.get(category).tags.join(', ')}\n`
  }

  description += `${matchWeight} points out a possible ${totalWeight}: ${Math.round(100 * matchWeight / totalWeight)}% match\n`

  return description
}