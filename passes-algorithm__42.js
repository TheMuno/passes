const firebaseUrl = 'https://getspreadsheetdata-qqhcjhxuda-uc.a.run.app';
const $processLead = document.querySelector('.ak-process-lead');
const $resultsWrap = document.querySelector('.ak-results');
const userPreferences = {};
const $perDay = document.querySelector('.ak-per-day');
const $maxRecommends = document.querySelector('.ak-max-recommends');
const relaxedPerDayCount = 2;
const moderatePerDayCount = 3;
const packedPerDayCount = 4;
// let groupSize = Number($perDay.value) || attractionsToShowPerDay;
// let maxRecommendationsCount = Number($maxRecommends.value) || userMaxRecommendationsCount;

$perDay.value = attractionsToShowPerDay; // defaults
$maxRecommends.value = userMaxRecommendationsCount;

$perDay.addEventListener('change', e => {
  localStorage['ak-perDayCount'] = $perDay.value;
});

// $maxRecommends.addEventListener('change', e => {
//   localStorage['ak-maxRecommendationCount'] = $maxRecommends.value;
// });

$processLead.addEventListener('click', async e => {
  e.preventDefault();

  const groupSize = Number(localStorage['ak-perDayCount']) || Number($perDay.value) || attractionsToShowPerDay;
  const maxRecommendationsCount = Number($maxRecommends.value) || userMaxRecommendationsCount;

  // console.log('groupSize:', groupSize)
  // console.log('maxRecommendationsCount:', maxRecommendationsCount)

  const $travelDates = document.querySelector('.ak-travel-dates-input:not([type=hidden])');
  const $travelGroup = document.querySelector('#Travel-Group-Display');
  const $neighborhoodSection = document.querySelector('.ak-section.ak-neighborhood');
  const $interest = document.querySelector('.ak-interests .ak-checkbox input[type=checkbox]:checked');
  const $pace = document.querySelector('[name="Pace"]:checked');
  const $budget = document.querySelector('#Budget-Display');

  if ($travelDates.value.trim() === '') {
    console.log('Travel dates missing');
    const $section = $travelDates.closest('.ak-section');
    highlightSec($section);
    return;
  }

  if ($travelGroup.value.trim() === '') {
    console.log('Travel group missing');
    const $section = $travelGroup.closest('.ak-section');
    highlightSec($section);
    return;
  }

  if (userPreferences['neighborhood'] === undefined) {
    console.log('Neighborhood missing');
    highlightSec($neighborhoodSection);
    return;
  }

  if ($interest === null) {
    console.log('User interests missing');
    const $interestCB = document.querySelector('.ak-interests .ak-checkbox input[type=checkbox]');
    const $section = $interestCB.closest('.ak-section');
    highlightSec($section);
    return;
  }

  if ($pace === null) {
    console.log('Preferred pace missing');
    const $paceRB = document.querySelector('[name="Pace"]');
    const $section = $paceRB.closest('.ak-section');
    highlightSec($section);
    return;
  }

  if ($budget.value.trim() === '') {
    console.log('Budget missing');
    const $section = $budget.closest('.ak-section');
    highlightSec($section);
    return;
  }

  function highlightSec(section) {
    section.classList.add('active');
    section.scrollIntoView();
    setTimeout(()=>section.classList.remove('active'),2000);
  }

  const btnText = $processLead.value;
  $processLead.value = 'Processing...';
  const allAttractions = await logSheetData();
  const filteredAttractions = getRecommendations(userPreferences, allAttractions, groupSize, maxRecommendationsCount); 
  $processLead.value = btnText;
  console.log('filteredAttractions:', filteredAttractions)

  $resultsWrap.innerHTML = '';
  if (filteredAttractions.length) {
    filteredAttractions.forEach((attraction, i) => {
      
      if (i % groupSize === 0) {
        const day = `Day ${Math.floor(i / groupSize) + 1}`;
        const $div = document.createElement('div');
        $div.className = 'ak-attraction-result-day';
        $div.textContent = day;
        $resultsWrap.append($div);
      }

      const { attraction_name, 
        why_description, 
        on_pass, 
        passes, 
        individual_price, 
        cost, 
        category, 
        category_secondary, 
        neighborhood, 
        pace_friendly, 
        budget_level } = attraction;
      const $div = document.createElement('div');
      $div.className = 'ak-attraction-result';
      $div.innerHTML = `<div><b>${attraction_name}</b> - ${why_description}</div>
      <br>
      <div><b>On Pass:</b> ${on_pass}</div>
      <div><b>Passes:</b> ${passes}</div>
      <div><b>Individual Price:</b> ${individual_price}</div>
      <div><b>Cost:</b> ${cost}</div>
      <div><b>Category:</b> ${category}</div>
      <div><b>Category Secondary:</b> ${category_secondary}</div>
      <div><b>Neighborhood:</b> ${neighborhood}</div>
      <div><b>Pace Friendly:</b> ${pace_friendly}</div>
      <div><b>Budget Level:</b> ${budget_level}</div>
      <br>
      <br>`;
      $resultsWrap.append($div);
    });
  } 
  else {
    $resultsWrap.innerHTML = '<i>No attractions match!</i>';
  } 
});

logSheetData(); 

async function logSheetData() {
  const res = await fetch(firebaseUrl);
  const data = await res.json();
  console.log('Data:', data);
  return data;
}


/** Setting up user preferences */
const $el = document.querySelector('.ak-travel-dates-input');
const fp = flatpickr($el, {
  mode: 'range',
  altInput: true,
  enableTime: false,
  altFormat: 'D M j',
  dateFormat: 'Y-m-d',
  minDate: 'today',
  onClose: (selectedDates, dateStr, instance) => { 
    const start = selectedDates[0];
    const end = selectedDates[1];
    userPreferences.travelDates ||= {};
    userPreferences.travelDates = { start, end };
    
  	// console.log('selectedDates:', selectedDates)    
    // console.log('dateStr:', dateStr) 
    console.log('userPreferences:', userPreferences) 
  },
});

// close dropdown on link click 
const $dropDownLinks = document.querySelectorAll('.w-dropdown-link');
$dropDownLinks.forEach(link => {
  link.addEventListener('click', e => {
  	const $dropdown = link.closest('.w-dropdown');
  	const text = link.textContent.trim();
    const $display = $dropdown
    .closest('.ak-section').querySelector('.ak-display').value = text;
  
    const $toggle = $dropdown.querySelector('.w-dropdown-toggle');
    $toggle.dispatchEvent(new Event('mouseup'));
    
    const dropdownType = link.closest('[data-ak-dropdown]').getAttribute('data-ak-dropdown');
    if (dropdownType.includes('travelGroup')) {
      userPreferences['travelGroup'] = text;
    }
    else if (dropdownType.includes('budget')) {
      userPreferences['budget'] = text;
    }
  });
});

const $interestCheckboxes = document.querySelectorAll('.ak-checkbox input[type=checkbox]');
$interestCheckboxes.forEach(interestCheckbox => {
    interestCheckbox.addEventListener('click', e => {
        const interest = interestCheckbox.getAttribute('data-name');
        userPreferences['interests'] ||= [];
        userPreferences['interests'].push(interest);
    });
});

const $paceRadioBtns = document.querySelectorAll('[name=Pace]');
$paceRadioBtns.forEach(paceRadio => {
	paceRadio.addEventListener('click', e => {
    const paceValue = paceRadio.value;
		userPreferences['pace_friendly'] = paceValue;

    console.log('paceValue:', paceValue)
    if (paceValue.includes('relaxed')) {
      localStorage['ak-perDayCount'] = relaxedPerDayCount;
      $perDay.value = relaxedPerDayCount;
    }
    else if (paceValue.includes('moderate')) {
      localStorage['ak-perDayCount'] = moderatePerDayCount;
      $perDay.value = moderatePerDayCount;
    }
    else if (paceValue.includes('packed')) {
      localStorage['ak-perDayCount'] = packedPerDayCount;
      $perDay.value = packedPerDayCount;
    }
	});
});

!async function setupNeighborhoodAutocomplete() {
  await google.maps.importLibrary('places');
  
  const locationNYC = { lat: 40.7580, lng: -73.9855 };

  // Create the input HTML element, and append it.
  const placeAutocomplete = new google.maps.places.PlaceAutocompleteElement({
      componentRestrictions: {country: ['us']},
      includedRegionCodes: ['us'],
      locationBias: {
        radius: 5000.0,
        center: locationNYC,
      },
      // includedPrimaryTypes: ['lodging', 'hotel'], 
  });
  
  const $autocompleteWrap = document.querySelector('.ak-neighborhood-input');
  $autocompleteWrap?.appendChild(placeAutocomplete);

  const placeholderText = 'Search for hotel...'; 
  // if (placeAutocomplete.Eg) {
  //   placeAutocomplete.Eg.setAttribute('placeholder', placeholderText);
  // }

  // Add the gmp-placeselect listener, and display the results.
  placeAutocomplete.addEventListener('gmp-select', async (res) => {
  	const { placePrediction } = res;
    const place = placePrediction.toPlace();
    await place.fetchFields({ fields: ['displayName', 'location', 'editorialSummary'] });

    const placeObj = place.toJSON(); 
    
    const { 
      displayName, 
      location: { lat, lng },
      editorialSummary,
      types: type,
    } = placeObj; 

		userPreferences['neighborhood'] = displayName;
  });
}(); 

/****** Scoring Algorithm (Updated) ******/

/**
 * 
 *  Filter by Availability
 */

function filterByAvailability(attractions, userTravelDates) {
  return Object.values(attractions).filter(attraction => {
    // Check if active
    if (!attraction.active.trim().toLowerCase().includes('true')) return false;
    
    // HOLIDAYS_ONLY CHECK (Updated column name)
    if (attraction.holidays_only.trim().toLowerCase().includes('true')) {
      // Only show if user's dates fall within holiday season
      if (!isHolidaySeason(userTravelDates)) {
        return false; // Filter out - not available
      }
    }
    
    // Check season rating for user's travel season
    const season = getSeason(userTravelDates.start);
    const seasonRating = attraction[`season_rating_${season}`];
    
    // Optional: Filter out attractions that are closed (rating = 0)
    // if (seasonRating === 0) return false;
    
    return true;
  });
}

function isHolidaySeason(travelDates) {
  // Holiday season: November 15 - January 5
  // Return true if ANY of the user's travel dates overlap with this period
  
  const startDate = new Date(travelDates.start);
  const endDate = new Date(travelDates.end);
  
  // Get current year's holiday season dates
  const year = startDate.getFullYear();
  const holidayStart = new Date(year, 10, 15); // Nov 15
  const holidayEnd = new Date(year + 1, 0, 5); // Jan 5 next year
  
  // Check for overlap
  return (startDate <= holidayEnd && endDate >= holidayStart);
}

function getSeason(date) {
  const month = new Date(date).getMonth(); // 0-11
  if (month >= 2 && month <= 4) return 'spring';  // Mar-May
  if (month >= 5 && month <= 7) return 'summer';  // Jun-Aug
  if (month >= 8 && month <= 10) return 'fall';   // Sep-Nov
  return 'winter'; // Dec-Feb
}


/**
 * 
 *  Score Each Attraction
 */

function scoreAttraction(attraction, userPreferences) {
  let score = 0;
  let scoreEl = '<div class="ak-scores">';
  
  // 1. TRAVEL GROUP MATCH (+10 points)
  const bestFor = attraction.best_for.split(',');
  if (bestFor.includes(userPreferences.travelGroup) || bestFor.includes('all')) {
    score += 10;
    scoreEl += `<i>Best for: ${userPreferences.travelGroup} - ${score}</i>`;
  }
  
  // 2. INTEREST CATEGORY MATCH (+20 points per match)
  userPreferences.interests.forEach(interest => {
    // Convert form checkbox value to database category value
    const categoryValue = mapInterestToCategory(interest);
    
    if (attraction.category === categoryValue) {
      score += 20;
      scoreEl += `<i>Category: ${categoryValue} - ${score}</i>`;
    }
    if (attraction.category_secondary === categoryValue) {
      score += 20;
      scoreEl += `<i>Category Secondary: ${categoryValue} - ${score}</i>`;
    }
  });
  
  // 3. BUDGET MATCH (+10 points)
  if (attraction.budget_level === userPreferences.budget) {
    score += 10;
    scoreEl += `<i>Budget: ${userPreferences.budget} - ${score}</i>`;
  }
  
  // 4. NEIGHBORHOOD PROXIMITY (+5 points)
  if (attraction.neighborhood === userPreferences.neighborhood) {
    score += 5;
    scoreEl += `<i>Neighborhood: ${userPreferences.neighborhood} - ${score}</i>`;
  }
  
  // 5. SEASON RATING (0-5 points)
  const season = getSeason(userPreferences.startDate);
  score += attraction[`season_rating_${season}`];
  scoreEl += `<i>Season (${userPreferences.startDate}): ${season} - ${score}</i>`;
  
  // 6. PACE COMPATIBILITY (+5 points)
  const paceOptions = attraction.pace_friendly.split(',');
  if (paceOptions.includes(userPreferences.pace)) {
    score += 5;
    scoreEl += `<i>Pace: ${userPreferences.pace} - ${score}</i>`;
  }
  
  // 7. ICONIC BONUS (optional - for first-time visitors)
  // if (userPreferences.firstTimeVisitor && attraction.iconic === true) {
  //   score += 15;
  // }

  scoreEl += '</div>';
  
  return { score, scoreEl };
}

function mapInterestToCategory(formCheckboxValue) {
  // Map user-facing checkbox text to database category values
  const mapping = {
    'Museums': 'museums',
    'Observation Decks / Views': 'observation-decks',
    'Food & Markets': 'food',
    'Outdoor Activities & Parks': 'outdoor-activities',
    'Historical Sites': 'history',
    'Shopping': 'shopping',
    'Family Entertainment': 'family-entertainment',
    'Shows & Nightlife': 'nightlife-shows',
    'Tours & Cruises': 'tours'
  };
  return mapping[formCheckboxValue];
}


/**
 * 
 *  Generate Recommendations
 */

function getRecommendations(userPreferences, allAttractions, groupSize, maxRecommendationsCount) {
  // 1. Filter by availability (holidays_only + season ratings)
  const availableAttractions = filterByAvailability(allAttractions, userPreferences.travelDates);

  console.log('availableAttractions:', availableAttractions)
  
  // 2. Score all available attractions
  const scoredAttractions = availableAttractions.map(attr => ({
    ...attr,
    score: scoreAttraction(attr, userPreferences)//.score
  }));

  console.log('scoredAttractions:', scoredAttractions)
  
  // 3. Filter minimum relevance (optional)
  const relevantAttractions = scoredAttractions; //.filter(attr => attr.score > 10);
  
  // 4. Sort by score (highest first)
  relevantAttractions.sort((a, b) => b.score - a.score);
  
  // 5. Determine number of recommendations based on trip length
  const tripLength = calculateDays(userPreferences.travelDates.start, userPreferences.travelDates.end) + 1;
  const maxRecommendations = Math.min(tripLength * groupSize, maxRecommendationsCount); // groupSize (e.g. 2) per day, max 10

  console.log('tripLength:', tripLength)
  console.log(`tripLength * ${groupSize}}:`, tripLength * groupSize)
  console.log(`maxRecommendations (${groupSize} per day, max ${maxRecommendationsCount}):`, maxRecommendations)
  
  // 6. Return top N recommendations
  return relevantAttractions.slice(0, maxRecommendations);
}

function calculateDays(startDate, endDate) {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const startDateTime = new Date(startDate).getTime();
  const endDateTime = new Date(endDate).getTime();
  const days = (endDateTime - startDateTime) / millisecondsPerDay;
  // console.log('startDateTime:', startDateTime)
  // console.log('endDateTime:', endDateTime)
  // console.log('endDateTime - startDateTime:', endDateTime - startDateTime)
  console.log('Days:', days)
  return days;
}

/****** Weather Planning (Using indoor_outdoor Column) ******/

function filterByWeather(attractions, weatherConditions) {
  if (weatherConditions === 'rainy' || weatherConditions === 'cold') {
    // Prioritize indoor activities
    return attractions.filter(attr => 
      attr.indoor_outdoor === 'indoor' || attr.indoor_outdoor === 'both'
    );
  }
  
  if (weatherConditions === 'sunny') {
    // Could boost outdoor activities
    return attractions.map(attr => {
      if (attr.indoor_outdoor === 'outdoor') {
        attr.score += 10; // Bonus for outdoor on nice days
      }
      return attr;
    });
  }
  
  return attractions; // No weather filter
}



/****** Pass Comparison Logic ******/

/**
 * 
 *  Check if Email Gate Should Appear
 */

function shouldShowEmailGate(recommendations) {
  // Count how many recommendations are on passes
  const onPassCount = recommendations.filter(attr => attr.on_pass === true).length;
  
  // Show email gate if 2 or more attractions are on passes
  return onPassCount >= 2;
}

/**
 * 
 *  Calculate Pass Savings
 */

function calculatePassComparison(recommendations, allPasses) {
  // 1. Filter to only attractions on passes
  const passAttractions = recommendations.filter(attr => attr.on_pass === true);
  
  // 2. Calculate individual ticket total
  const individualTotal = passAttractions.reduce((sum, attr) => {
    return sum + attr.individual_price;
  }, 0);
  
  // 3. For each pass, calculate savings
  const passComparisons = allPasses.map(pass => {
    // Count how many selected attractions this pass covers
    const coveredAttractions = passAttractions.filter(attr => {
      const passesArray = attr.passes.split(',');
      return passesArray.includes(pass.pass_name);
    });
    
    const coveredCount = coveredAttractions.length;
    
    // Only show passes that cover 2+ selected attractions
    if (coveredCount < 2) return null;
    
    // Calculate savings
    const savings = individualTotal - pass.pass_price;
    
    return {
      pass_name: pass.pass_name,
      pass_price: pass.pass_price,
      savings: savings,
      covered_count: coveredCount,
      covered_attractions: coveredAttractions.map(a => a.attraction_name),
      details: pass.details,
      affiliate_link: pass.affiliate_link
    };
  }).filter(p => p !== null); // Remove passes that don't cover 2+ attractions
  
  // 4. Sort by savings (highest first)
  passComparisons.sort((a, b) => b.savings - a.savings);
  
  return {
    individual_total: individualTotal,
    pass_comparisons: passComparisons,
    best_pass: passComparisons[0] // Highest savings
  };
}


