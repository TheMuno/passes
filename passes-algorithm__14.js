const firebaseUrl = 'https://getspreadsheetdata-qqhcjhxuda-uc.a.run.app';
const $processLead = document.querySelector('.ak-process-lead');
const $resultsWrap = document.querySelector('.ak-results');
const userPreferences = {};

$processLead.addEventListener('click', async e => {
  e.preventDefault();
  const btnText = $processLead.value;
  $processLead.value = 'Processing...';
  const allAttractions = await logSheetData();
  const filteredAttractions = getRecommendations(userPreferences, allAttractions); 
  $processLead.value = btnText;
  console.log('filteredAttractions:', filteredAttractions)

  $resultsWrap.innerHTML = '';
  if (filteredAttractions.length) {
    filteredAttractions.forEach(attraction => {
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
      <div>On Pass: ${on_pass}</div>
      <div>Passes: ${passes}</div>
      <div>Individual Price: ${individual_price}</div>
      <div>Cost: ${cost}</div>
      <div>Category: ${category}</div>
      <div>Category Secondary: ${category_secondary}</div>
      <div>Neighborhood: ${neighborhood}</div>
      <div>Pace Friendly: ${pace_friendly}</div>
      <div>Budget Level: ${budget_level}</div>`;
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
    
  	console.log('selectedDates:', selectedDates)    
    console.log('dateStr:', dateStr) 
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
		userPreferences['pace_friendly'] = paceRadio.value;
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
  
  // 1. TRAVEL GROUP MATCH (+10 points)
  const bestFor = attraction.best_for.split(',');
  if (bestFor.includes(userPreferences.travelGroup) || bestFor.includes('all')) {
    score += 10;
  }
  
  // 2. INTEREST CATEGORY MATCH (+20 points per match)
  userPreferences.interests.forEach(interest => {
    // Convert form checkbox value to database category value
    const categoryValue = mapInterestToCategory(interest);
    
    if (attraction.category === categoryValue) {
      score += 20;
    }
    if (attraction.category_secondary === categoryValue) {
      score += 20;
    }
  });
  
  // 3. BUDGET MATCH (+10 points)
  if (attraction.budget_level === userPreferences.budget) {
    score += 10;
  }
  
  // 4. NEIGHBORHOOD PROXIMITY (+5 points)
  if (attraction.neighborhood === userPreferences.neighborhood) {
    score += 5;
  }
  
  // 5. SEASON RATING (0-5 points)
  const season = getSeason(userPreferences.startDate);
  score += attraction[`season_rating_${season}`];
  
  // 6. PACE COMPATIBILITY (+5 points)
  const paceOptions = attraction.pace_friendly.split(',');
  if (paceOptions.includes(userPreferences.pace)) {
    score += 5;
  }
  
  // 7. ICONIC BONUS (optional - for first-time visitors)
  // if (userPreferences.firstTimeVisitor && attraction.iconic === true) {
  //   score += 15;
  // }
  
  return score;
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

function getRecommendations(userPreferences, allAttractions) {
  // 1. Filter by availability (holidays_only + season ratings)
  const availableAttractions = filterByAvailability(allAttractions, userPreferences.travelDates);
  
  // 2. Score all available attractions
  const scoredAttractions = availableAttractions.map(attr => ({
    ...attr,
    score: scoreAttraction(attr, userPreferences)
  }));
  
  // 3. Filter minimum relevance (optional)
  const relevantAttractions = scoredAttractions; //.filter(attr => attr.score > 10);
  
  // 4. Sort by score (highest first)
  relevantAttractions.sort((a, b) => b.score - a.score);
  
  // 5. Determine number of recommendations based on trip length
  const tripLength = calculateDays(userPreferences.travelDates.start, userPreferences.travelDates.end);
  const maxRecommendations = Math.min(tripLength * 2, 10); // 2 per day, max 10
  
  // 6. Return top N recommendations
  return relevantAttractions.slice(0, maxRecommendations);
}

function calculateDays(startDate, endDate) {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const startDateTime = new Date(startDate).getTime();
  const endDateTime = new Date(endDate).getTime();
  return (endDateTime - startDateTime) / millisecondsPerDay;
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


