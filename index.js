// Other recommenders I thought of:
// - 'Top' matches -- sort_by_tags for the top ~100/~1000 games (by some metric)
// - 'New' matches -- sort_by_tags for games in the last week/month/year (probably year)
// TODO: Consider tagging app_details with the last refreshed time (not sure how I'd display that, per se)
// TODO: Default exclude R18 tags (e.g. ['Sexual Content'], maybe 'gore'?)
// TODO: If the currently active game is excluded by tags, how do we reload? -> I think we actually just *do nothing*.
// TODO: Cache filtered tags in localstorage?
window.onload = function() {
  setupDropdowns()

  window.loadDataFiles()
  var params = new URLSearchParams(window.location.search)
  if (params.has('appid') && window.globalRatingData.has(params.get('appid'))) {
    setActiveGame(params.get('appid'))
  } else {
    // Then pick one of the top 20 (randomly) -- these should be games that people should be familiar with (I hope).
    var index = Math.floor(Math.random() * 20)
    var topGames = window.top_games()
    setActiveGame(topGames[index])
  }
}

function set(id, key, value) {
  var elem = document.getElementById(id)
  if (key == 'innerText') {
    elem.innerText = value
  } else if (key == 'hover') {
    elem.onmouseenter = () => {
      // Once the mouse enters this element, wait for 0.5 seconds of no mouse movement, then call the callback.
      var timer = setTimeout(value, 500)
      elem.onmousemove = () => {
        clearTimeout(timer)
        timer = setTimeout(value, 500)
      }
      elem.onmouseleave = () => { clearTimeout(timer) }
    }
  } else if (key == 'click') {
    elem.onpointerdown = value
  } else if (key == 'style') {
    elem.style = value
  } else if (key == 'display') {
    elem.style.display = value
  } else {
    elem.setAttribute(key, value)
  }
}

// Global objects used across functions
var previousGames = [] // Keep track of previous games so that we can use the 'back' button to go back.
var pageNo = 0 // Keep track of each page of results so that we can use 'more' to get more results
var includedTags = new Set() // Tags which must be included on all games
var excludedTags = new Set() // Tags which must NOT be included on all games
var gamesOffset = 0 // Global value which tracks how far the games dropdown is scrolled
var includedTagOffset = 0 // Global value which tracks how far the included tags dropdown is scrolled
var excludedTagOffset = 0 // Global value which tracks how far the excluded tags dropdown is scrolled
var activeGameId = 0 // Global storage of the active game so that we can reload recommenders as needed.
function setActiveGame(gameId) {
  loadAboutGame(gameId)
  pageNo = 0 // Reset back to the first page of results
  loadImages(gameId)
  setupButtons(gameId)
  activeGameId = gameId
}

var styles = {
  'Selected':       'background: white;       color: black; font-weight: bold; font-size: 20px',
  'Hidden gem':     'background: deepskyblue; color: white; font-weight: bold; font-size: 20px',
  'Similar tags':   'background: darkgreen;   color: white; font-weight: bold; font-size: 20px',
  'Loose match':    'background: sienna;      color: white; font-weight: bold; font-size: 20px',
  'Reverse match':  'background: darkmagenta; color: white; font-weight: bold; font-size: 20px',
  'Default match':  'background: darkred;     color: white; font-weight: bold; font-size: 20px',
}

function setImageCard(loc, data) {
  var [gameId, recommender, baseGameId] = data
  set(loc + '-cell', 'hover', () => loadAboutGame(gameId))
  set(loc + '-cell', 'click', () => { previousGames.push(baseGameId); setActiveGame(gameId) })
  set(loc + '-cell', 'style', styles[recommender])
  set(loc + '-title', 'innerText', recommender)
  set(loc + '-title', 'href', 'https://store.steampowered.com/app/' + gameId)
  set(loc + '-image', 'src', `https://cdn.akamai.steamstatic.com/steam/apps/${gameId}/header.jpg`)
  
  if (gameId == null) return // Ran out of recommendations

  var gameName = globalGameData.get(gameId).name
  var baseGameName = globalGameData.get(baseGameId).name

  var titleText = {
    'Selected': ``,
    'Hidden gem': `Hidden gem
${gameName} is a highly-rated but little-known game with several tags in common with ${baseGameName}:
${compare_candidates_verbose(baseGameId, gameId)}`,
    'Similar tags': `Similar tags
${gameName} has several tags in common with ${baseGameName}:
${compare_candidates_verbose(baseGameId, gameId)}`,
    'Loose match': `Loose match
${gameName} is a loose "more like this" match for ${baseGameName}.
It is commonly recommended by games which are recommended by ${baseGameName}.`,
    'Reverse match': `Reverse match
${gameName} is a reverse "more like this" match for ${baseGameName},
i.e. ${baseGameName} is recommended by ${gameName}.`,
    'Default match': `Default match
${gameName} is a "default" match, since it is directly recommended by ${baseGameName}.`,
  }[recommender]
  set(loc + '-image', 'title', titleText)

  if (recommender == 'Hidden gem' || recommender == 'Similar tags') {
    var perc = Math.round(100 * compare_candidates(baseGameId, gameId)) + '%'
    set(loc + '-note', 'innerText', perc)
  } else {
    set(loc + '-note', 'innerText', null)
  }
}

// Check to see if there are globally included/excluded tags, and filter games based on that
function matchesUserTags(gameId) {
  if (!window.globalGameData.has(gameId)) return true // TODO: vacuously true for now
  var tags = window.globalGameData.get(gameId).tags
  if (includedTags.size > 0 && !includedTags.intersection(tags).size > 0) return false
  if (excludedTags.size > 0 && excludedTags.intersection(tags).size > 0) return false
  return true
}

function loadImages(baseGameId) {
  var r_gems = document.getElementById('r_gems').className == 'toggle'
  var r_tags = document.getElementById('r_tags').className == 'toggle'
  var r_loose = document.getElementById('r_loose').className == 'toggle'
  var r_reverse = document.getElementById('r_reverse').className == 'toggle'

  var num_enabled = (r_gems ? 1 : 0) + (r_tags ? 1 : 0) + (r_loose ? 1 : 0) + (r_reverse ? 1 : 0)
  var per_category = [12, 8, 4, 3, 2][num_enabled]

  var gems = gem_matches(baseGameId)
  var tags = tag_matches(baseGameId)
  var loose = loose_matches(baseGameId)
  var reverse = reverse_matches(baseGameId)
  var similar = default_matches(baseGameId)

  var shownGames = new Set()
  for (var page = 0; page <= pageNo; page++) {
    var matches = []
    if (r_gems) {
      for (var i = 0; i < per_category; i++) {
        if (matches.length == 8) break
        if (gems.length == 0) break
        var gameId = gems.shift()
        if (shownGames.has(gameId) || !matchesUserTags(gameId)) i--
        else {
          matches.push([gameId, 'Hidden gem', baseGameId])
          shownGames.add(gameId)
        }
      }
    }
    if (r_tags) {
      for (var i = 0; i < per_category; i++) {
        if (matches.length == 8) break
        if (tags.length == 0) break
        var gameId = tags.shift()
        if (shownGames.has(gameId) || !matchesUserTags(gameId)) i--
        else {
          matches.push([gameId, 'Similar tags', baseGameId])
          shownGames.add(gameId)
        }
      }
    }
    if (r_loose) {
      for (var i = 0; i < per_category; i++) {
        if (matches.length == 8) break
        if (loose.length == 0) break
        var gameId = loose.shift()
        if (shownGames.has(gameId) || !matchesUserTags(gameId)) i--
        else {
          matches.push([gameId, 'Loose match', baseGameId])
          shownGames.add(gameId)
        }
      }
    }
    if (r_reverse) {
      for (var i = 0; i < per_category; i++) {
        if (matches.length == 8) break
        if (reverse.length == 0) break
        var gameId = reverse.shift()
        if (shownGames.has(gameId) || !matchesUserTags(gameId)) i--
        else {
          matches.push([gameId, 'Reverse match', baseGameId])
          shownGames.add(gameId)
        }
      }
    }
    // Fallback to Steam's recommendations if we run out of our recommenders
    for (var i = 0; /**/; i++) {
      if (matches.length == 8) break
      if (similar.length == 0) break
      var gameId = similar.shift()
      if (shownGames.has(gameId) || !matchesUserTags(gameId)) i--
      else {
        matches.push([gameId, 'Default match', baseGameId])
        shownGames.add(gameId)
      }
    }
    // Placeholder if we run out of everything so we don't crash
    while (matches.length < 8) matches.push([null, null, baseGameId])
  }

  setImageCard('mm', [baseGameId, 'Selected', baseGameId])
  setImageCard('tl', matches[0])
  setImageCard('tm', matches[1])
  setImageCard('tr', matches[2])
  setImageCard('mr', matches[3])
  setImageCard('br', matches[4])
  setImageCard('bm', matches[5])
  setImageCard('bl', matches[6])
  setImageCard('ml', matches[7])

  // Setup alt text for the various dynamic buttons
  set('r_gems', 'title', (r_gems ? 'Disable' : 'Enable') + ' the "Gems" recommender')
  set('r_tags', 'title', (r_tags ? 'Disable' : 'Enable') + ' the "Tags" recommender')
  set('r_loose', 'title', (r_loose ? 'Disable' : 'Enable') + ' the "Loose" recommender')
  set('r_reverse', 'title', (r_reverse ? 'Disable' : 'Enable') + ' the "Reverse" recommender')

  if (pageNo > 0) { // If there are still previous pages
    set('back', 'title', `Previous results for ${globalGameData.get(baseGameId).name}`)
    set('back', 'class', 'navigation')
  } else if (previousGames.length > 0) { // Otherwise, this button goes back to the previous game
    var previousGame = previousGames[previousGames.length - 1]
    set('back', 'title', `Back to results for ${globalGameData.get(previousGame).name}`)
    set('back', 'class', 'navigation')
  } else {
    set('back', 'title', '')
    set('back', 'class', 'navigation-disabled')
  }

  set('more', 'title', `More results for ${globalGameData.get(baseGameId).name}`)
}

function setupButtons(gameId) {
  var toggleRecommender = function() {
    if (this.className === 'toggle') {
      this.className = 'toggle-off'
    } else {
      this.className = 'toggle'
    }

    loadImages(gameId)
  }

  set('r_gems', 'click', toggleRecommender)
  set('r_tags', 'click', toggleRecommender)
  set('r_loose', 'click', toggleRecommender)
  set('r_reverse', 'click', toggleRecommender)

  set('back', 'click', () => {
    if (pageNo > 0) { // If there are previous pages of results, go to them
      pageNo--
      loadImages(gameId)
    } else if (previousGames.length > 0) { // Otherwise, go back to the previous game
      setActiveGame(previousGames.pop())
    }
  })
  set('more', 'click', () => {
    pageNo++
    loadImages(gameId)
  })
}

function loadAboutGame(gameId) {
  // If this game is already loaded, don't reload it (it causes a flicker and restarts the video)
  if (document.getElementById('open-app').href == `steam://store/${gameId}`) return

  set('game-title', 'innerText', globalGameData.get(gameId).name)

  set('open-web', 'href', `https://store.steampowered.com/app/${gameId}?utm_campaign=steamdivingbell`)
  set('open-app', 'href', `steam://store/${gameId}`)

  loadGameDetails(gameId)
  .then(r => {
    set('short-description', 'innerText', r.description)
    set('genres', 'innerText', r.genres.join(', '))
    set('price', 'innerText', r.price)
    set('platforms', 'innerText', r.platforms.join(', '))
    set('categories', 'innerText', r.categories.join(', '))
    set('tags', 'innerText', r.tags.join(', '))
    set('rating', 'innerText', globalRatingData.get(gameId).ratingText)
    set('releaseDate', 'innerText', r.releaseDate)

    var max_photos = 4
    if (r.video != null) {
      set('video', 'display', null)
      set('video', 'src', r.video)
      max_photos--
    } else {
      set('video', 'display', 'none')
      set('video', 'src', '')
    }      

    for (var i = 0; i < 4; i++) {
      if (i < max_photos && r.screenshots.length > i) {
        set('photo-' + i, 'display', null)
        set('photo-' + i, 'src', r.screenshots[i])
      } else {
        set('photo-' + i, 'display', 'none')
        set('photo-' + i, 'src', '')
      }
    }
  })
}


function setupDropdowns() {
  var gameSearch = document.getElementById('search_games_input')
  var gameSearchList = document.getElementById('search_games_list')
  gameSearch.addEventListener('pointerdown', () => {
    gameSearch.value = ''
    gameSearch.style.color = 'black'
    gameSearchList.style.display = null
    gamesOffset = 0 // Reset offset when opening the dropdown
    populateGamesDropdown()
  })

  gameSearch.addEventListener('input', () => {
    gamesOffset = 0 // Reset offset when typing text
    populateGamesDropdown()
  })

  gameSearch.addEventListener('blur', (event) => {
    if (event != null && gameSearch.contains(event.relatedTarget)) return // Actually a user was clicking on a list entry
    gameSearch.value = 'Search for game'
    gameSearch.style.color = 'gray'
    gameSearchList.style.display = 'none'
  })

  var includeTagSearch = document.getElementById('search_include_input')
  var includeTagSearchList = document.getElementById('search_include_list')
  includeTagSearch.addEventListener('pointerdown', () => {
    includeTagSearch.value = ''
    includeTagSearch.style.color = 'black'
    includeTagSearchList.style.display = null
    includedTagOffset = 0 // Reset offset when opening the dropdown
    populateIncludeTagDropdown()
  })

  includeTagSearch.addEventListener('input', () => {
    includedTagOffset = 0 // Reset offset when typing text
    populateIncludeTagDropdown()
  })

  includeTagSearch.addEventListener('blur', (event) => {
    if (includeTagSearch.contains(event.relatedTarget)) return // Actually a user was clicking on a list entry
    if (includedTags.size === 0) {
      includeTagSearch.value = 'Include tags'
      includeTagSearch.style.color = 'gray'
    } else if (includedTags.size === 1) {
      includeTagSearch.value = 'Including 1 tag'
      includeTagSearch.style.color = 'black'
    } else {
      includeTagSearch.value = `Including ${includedTags.size} tags`
      includeTagSearch.style.color = 'black'
    }
      
    includeTagSearchList.style.display = 'none'
  })

  var excludeTagSearch = document.getElementById('search_exclude_input')
  var excludeTagSearchList = document.getElementById('search_exclude_list')
  excludeTagSearch.addEventListener('pointerdown', () => {
    excludeTagSearch.value = ''
    excludeTagSearch.style.color = 'black'
    excludeTagSearchList.style.display = null
    excludedTagOffset = 0 // Reset offset when opening the dropdown
    populateExcludeTagDropdown()
  })

  excludeTagSearch.addEventListener('input', () => {
    excludedTagOffset = 0 // Reset offset when typing text
    populateExcludeTagDropdown()
  })

  excludeTagSearch.addEventListener('blur', (event) => {
    if (excludeTagSearch.contains(event.relatedTarget)) return // Actually a user was clicking on a list entry
    if (excludedTags.size === 0) {
      excludeTagSearch.value = 'Exclude tags'
      excludeTagSearch.style.color = 'gray'
    } else if (excludedTags.size === 1) {
      excludeTagSearch.value = 'Excluding 1 tag'
      excludeTagSearch.style.color = 'black'
    } else {
      excludeTagSearch.value = `Excluding ${excludedTags.size} tags`
      excludeTagSearch.style.color = 'black'
    }
      
    excludeTagSearchList.style.display = 'none'
  })
}

function populateGamesDropdown() {
  var filter = document.getElementById('search_games_input').value
  if (filter != null) filter = filter.toUpperCase()
  var entries = []
  var skipped = 0
  for (var game of window.top_games()) {
    if (window.game_names[game].toUpperCase() == filter) { // Always list exact matches
      entries.unshift(game)
    } else if (filter == null || window.game_names[game].toUpperCase().includes(filter)) {
      if (skipped < gamesOffset) {
        skipped++
        continue
      }
      entries.push(game)
    }
  }

  populateDropdown(
    /*prefix*/'search_games',
    /*entries*/entries,
    /*getInnerText*/(entry) => window.game_names[entry],
    /*isSelected*/(entry) => false,
    /*onclick*/(entry) => {
      var gameSearch = document.getElementById('search_games_input')
      gameSearch.blur(null)
      setActiveGame(entry)
    },
    /*onwheel*/(offset) => {
      gamesOffset = Math.max(0, gamesOffset + offset)
      populateGamesDropdown()
    })
}

function populateIncludeTagDropdown() {
  var filter = document.getElementById('search_include_input').value
  if (filter != null) filter = filter.toUpperCase()
  var entries = []
  var skipped = 0
  for (var tagId in window.tags) { // TODO: Sort somehow? Maybe just alpha is enough?
    if (includedTags.has(tagId)) {
      entries.unshift(tagId)
    } else if (excludedTags.has(tagId)) {
      continue // Don't list tags in both lists at the same time
    } else if (filter == null || window.tags[tagId]['name'].toUpperCase().includes(filter)) {
      if (skipped < includedTagOffset) {
        skipped++
        continue
      }
      entries.push(tagId)
    }
  }
  
  populateDropdown(
    /*prefix*/'search_include',
    /*entries*/entries,
    /*getInnerText*/(entry) => window.tags[entry]['name'],
    /*isSelected*/(entry) => includedTags.has(entry),
    /*onclick*/(entry) => {
      if (includedTags.has(entry)) includedTags.delete(entry)
      else                         includedTags.add(entry)
      loadImages(activeGameId) // Reload recommended games
      populateIncludeTagDropdown()
    },
    /*onwheel*/(offset) => {
      includedTagOffset = Math.max(0, includedTagOffset + offset)
      populateIncludeTagDropdown()
    })
}

function populateExcludeTagDropdown() {
  var filter = document.getElementById('search_exclude_input').value
  if (filter != null) filter = filter.toUpperCase()
  var entries = []
  var skipped = 0
  for (var tagId in window.tags) { // TODO: Sort somehow? Maybe just alpha is enough?
    if (excludedTags.has(tagId)) {
      entries.unshift(tagId)
    } else if (includedTags.has(tagId)) {
      continue // Don't list tags in both lists at the same time
    } else if (filter == null || window.tags[tagId]['name'].toUpperCase().includes(filter)) {
      if (skipped < excludedTagOffset) {
        skipped++
        continue
      }
      entries.push(tagId)
    }
  }
  
  populateDropdown(
    /*prefix*/'search_exclude',
    /*entries*/entries,
    /*getInnerText*/(entry) => window.tags[entry]['name'],
    /*isSelected*/(entry) => excludedTags.has(entry),
    /*onclick*/(entry) => {
      if (excludedTags.has(entry)) excludedTags.delete(entry)
      else                         excludedTags.add(entry)
      loadImages(activeGameId) // Reload recommended games
      populateExcludeTagDropdown()
    },
    /*onwheel*/(offset) => {
      excludedTagOffset = Math.max(0, excludedTagOffset + offset)
      populateExcludeTagDropdown()
    })
}

function populateDropdown(prefix, entries, getInnerText, isSelected, onclick, onwheel) {
  for (var i = 0; i < 10; i++) {
    var dropdownEntry = document.getElementById(prefix + '_' + i)
    if (dropdownEntry == null) break
    if (i < entries.length) {
      dropdownEntry.style.display = null
      dropdownEntry.innerText = getInnerText(entries[i])
      dropdownEntry.setAttribute('entry', entries[i])

      if (isSelected(entries[i])) {
        dropdownEntry.style.background = 'blue'
        dropdownEntry.onmouseleave = (event) => event.currentTarget.style.background = 'blue'
      } else {
        dropdownEntry.style.background = 'white'
        dropdownEntry.onmouseleave = (event) => event.currentTarget.style.background = 'white'
      }
      if (dropdownEntry.matches(':hover')) dropdownEntry.style.background = 'lightblue' // Persist 'hover' color even as the list changes
      dropdownEntry.onmouseenter = (event) => event.currentTarget.style.background = 'lightblue'
      dropdownEntry.onpointerdown = (event) => {
        event.preventDefault()
        onclick(event.currentTarget.getAttribute('entry'))
      }
      dropdownEntry.onwheel = (event) => onwheel(Math.sign(event.deltaY))
    } else {
      dropdownEntry.style.display = 'none'
      dropdownEntry.innerText = ''
      dropdownEntry.onclick = null
      dropdownEntry.onmouseenter = null
      dropdownEntry.onmouseleave = null
    }
  }
}
