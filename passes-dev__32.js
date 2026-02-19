const $passTravelDates = document.querySelector('[data-ak="pass-travel-dates"]');
const $whosTravelling = document.querySelector('#whos-travelling');
const $interests = document.querySelector('[data-ak="interests"]');
const $interestsExpandBtn = document.querySelector('[data-ak="open-interests"]');
const $interestsExpandSec = document.querySelector('[data-ak="interests-expand-section"]');
const $pace = document.querySelector('#pace');
const $processPass = document.querySelector('[data-ak="process-pass"]');
const $resultsWrap = document.querySelector('.ak-results-wrap');
const $resultSample = $resultsWrap.querySelector('.ak-result');
const $results = $resultsWrap.querySelector('.ak-results');

const firebaseUrl = 'https://getspreadsheetdata-qqhcjhxuda-uc.a.run.app';
const relaxedPerDayCount = 2;
const moderatePerDayCount = 3;
const packedPerDayCount = 4;
const maxRecommendationsCount = 10;
let groupSize = 3;

initDatePicker($passTravelDates);

$pace.addEventListener('change', e => {
  if ($pace.value.toLowerCase().includes('relaxed')) {
    localStorage['ak-group-size'] = 2;
  }
  else if ($pace.value.toLowerCase().includes('moderate')) {
    localStorage['ak-group-size'] = 3;
  }
  else if ($pace.value.toLowerCase().includes('packed')) {
    localStorage['ak-group-size'] = 4;
  }
});

$processPass.addEventListener('click', async e => {
  e.preventDefault();
  const validated = validateFields();
  if (!validated) return;
  const userPreferences = collectFormData();
  console.log('userPreferences:', userPreferences);
  //$processPass.closest('form').submit();

  const btnText = $processPass.value;
  $processPass.value = 'Processing...';
  const { Attractions, Passes } = await logSheetData();
  const filteredAttractions = getRecommendations(userPreferences, Attractions, maxRecommendationsCount); 
  $processPass.value = btnText;
  console.log('filteredAttractions:', filteredAttractions)
  localStorage['ak-filtered-attractions'] = JSON.stringify(filteredAttractions);
  const attractionsNum = filteredAttractions.length; 

  const passData = Object.entries(Passes);
  const cityPassMatches = passData.filter(([id, data]) => data.pass_id.includes('citypass'));
  const cityPassSorted = cityPassMatches
    .sort((a, b) => Number(a[1].attraction_count) - Number(b[1].attraction_count));

  let bestCityPass;
  const cityPassExact = cityPassSorted.find(([id, pass]) => pass.attraction_count === attractionsNum);
  localStorage['ak-city-pass-name'] = cityPassExact[0];
  localStorage['ak-city-pass-price'] = cityPassExact[1].pass_price;

  if (cityPassExact) {
    bestCityPass = `${cityPassExact[0]} - ${cityPassExact[1].pass_price}`;
    localStorage['ak-city-pass-exact'] = true; 
  }
  else {
    const cityPassUpperLimit = cityPassSorted.find(([id, pass]) => pass.attraction_count >= attractionsNum);
    const cityPassLowerLimit = cityPassSorted.reverse().find(([id, pass]) => pass.attraction_count <= attractionsNum);

    bestCityPass = `${cityPassLowerLimit[0]} - ${cityPassLowerLimit[1].pass_price} ${cityPassUpperLimit[0]} - ${cityPassUpperLimit[1].pass_price}`;
    localStorage['ak-city-pass-lower-name'] = cityPassLowerLimit[0];
    localStorage['ak-city-pass-lower-price'] = cityPassLowerLimit[1].pass_price;
    localStorage['ak-city-pass-upper-name'] = cityPassUpperLimit[0];
    localStorage['ak-city-pass-upper-price'] = cityPassUpperLimit[1].pass_price;
  }

  const goCityMatches = passData.filter(([_, data]) => data.pass_id.includes('gocity_explorer'));
  console.log('passData:', passData)
  console.log('cityPassMatches:', cityPassMatches)
  console.log('bestCityPass:', bestCityPass)

  console.log('goCityMatches:', goCityMatches)

  /*function passes(passes, attractionsNum) {
    const passData = Object.entries(passes);
    const cityPassMatches = passData.filter(([pass, data]) => pass.id.includes('citypass'));

    const bestCityPass = cityPassMatches
    .sort((a, b) => a.count - b.count)
    .find(p => p.count >= userAttractions);

    const goCityMatches = passes.filter(p => p.id.includes('gocity_explorer'));
    const bestGoCity = goCityMatches
    .sort((a, b) => a.count - b.count)
    .find(p => p.count >= userAttractions);

    
    for (const [name, data] of passData) {
      if (name.toLowerCase().includes('citypass')) {
        const { attraction_count } = data;
      }
      else if (name.toLowerCase().includes('gocity_explorer')) {

      }

      const passName = passData.find(pass => {
        const [ name, data ] = pass;
        const { pass_id, attraction_count } = data;
        if (attraction_count >= attractionsNum) {
          return pass;
        } 
      })[0]; 
    }
  }*/

  $results.innerHTML = '';
  let attractionsTotalCost = 0;
  filteredAttractions.forEach(attraction => {
    const $result = $resultSample.cloneNode(true);
    $result.classList.remove('hide');
    const $onPass = $result.querySelector('.ak-pass-btn');
    const $offPass = $result.querySelector('.ak-no-pass');
    const $attractionName = $result.querySelector('[data-ak="attraction-name"]');
    const $timeNeeded = $result.querySelector('[data-ak="time-needed"]');
    const $cost = $result.querySelector('[data-ak="cost"]');

    const { 
      on_pass, 
      attraction_name, 
      time_needed,
      cost  
    } = attraction;

    attractionsTotalCost += Number(cost.replace(/[^0-9.]/g, ''));

    /*const passArray = passes.trim().toLowerCase().split(',');
    if (passArray.includes('citypass') && passArray.includes('go city')) {
      $attractionsCovered.textContent = 'All: CityPass & Go City';
    }
    else if (passArray.includes('citypass')) {
      $attractionsCovered.textContent = 'CityPass';
    }*/
    
    $attractionName.textContent = attraction_name;
    $timeNeeded.textContent = time_needed;
    $cost.textContent = cost;

    $results.append($result);
  });

  $resultsWrap.classList.remove('hide');
});

function collectFormData() {
  const travelDates = $passTravelDates.value;
  const traveller = $whosTravelling.value;
  const pace = $pace.value;
  const interests = [...$interests.querySelectorAll('input[type=checkbox]:checked')].map(cb => {
    return cb.getAttribute('name');
  });
  return { travelDates, traveller, pace, interests };
}

function validateFields() {
  const val = $passTravelDates.value.trim();
  if (!val) {
    highlight($passTravelDates);
    return;
  }
  
  if ($whosTravelling.selectedIndex === 0) {
    highlight($whosTravelling);
    return;
  }
  
  if ($interests.querySelector('input[type=checkbox]:checked') === null) {
    const $firstInterest = $interests.querySelector('input[type=checkbox]');
    highlight($firstInterest);
    const expandSecHeight = $interestsExpandSec.style.height;
    if (parseInt(expandSecHeight) === 0) $interestsExpandBtn.click();
    return;
  }
  
  if ($pace.selectedIndex === 0) {
    highlight($pace);
    return;
  }
  
  return true;
}

function highlight(input) {
  const $wrap = input.closest('.form_row');
  $wrap.classList.add('highlight');
  setTimeout(()=>$wrap.classList.remove('highlight'),2000);
}

function initDatePicker(el) {
  const fp = flatpickr(el, {
    mode: 'range',
    altInput: true,
    enableTime: false,
    altFormat: 'D M j',
    dateFormat: 'Y-m-d',
  	minDate: 'today',
    onClose: (selectedDates, dateStr, instance) => {
      // 
    },
  });
}

async function logSheetData() {
  const res = await fetch(firebaseUrl);
  const data = await res.json();
  console.log('Data:', data);
  return data;
} 

function getRecommendations(userPreferences, allAttractions, maxRecommendationsCount) {
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
  const dates = userPreferences.travelDates;
  const [startDate, endDate] = dates.split(/\s+to\s+/);
  const tripLength = calculateDays(startDate, endDate) + 1;
  groupSize = localStorage['ak-group-size'] ? localStorage['ak-group-size'] : groupSize;
  const maxRecommendations = Math.min(tripLength * groupSize, maxRecommendationsCount); // groupSize (e.g. 2) per day, max 10

  console.log('tripLength:', tripLength)
  console.log(`tripLength * ${groupSize}}:`, tripLength * groupSize)
  console.log(`maxRecommendations (${groupSize} per day, max ${maxRecommendationsCount}):`, maxRecommendations)
  
  // 6. Return top N recommendations
  return relevantAttractions.slice(0, maxRecommendations);

  function filterByAvailability(attractions, userTravelDates) {
    
    return Object.values(attractions).filter(attraction => {
      if (!attraction.active.trim().toLowerCase().includes('true') // remove inactive attractions
      || !attraction.on_pass.trim().toLowerCase().includes('true')) return false; // remove attractions not on pass
      
      if (attraction.holidays_only.trim().toLowerCase().includes('true')) {
        if (!isHolidaySeason(userTravelDates)) {
          return false; // Filter out - not available
        }
      }
      
      const season = getSeason(userTravelDates);
      const seasonRating = attraction[`season_rating_${season}`];
      
      // Optional: Filter out attractions that are closed (rating = 0)
      // if (seasonRating === 0) return false;
      
      return true;
    });
  }

  function isHolidaySeason(travelDates) {
    // Holiday season: November 15 - January 5
    // Return true if ANY of the user's travel dates overlap with this period

    let [ startDate, endDate ] = travelDates.split(/\s+to\s+/);
    if (!endDate) endDate = startDate;
    startDate = new Date(startDate);
    endDate = new Date(endDate);
    // const startDate = new Date(travelDates.start);
    // const endDate = new Date(travelDates.end);
    
    // Get current year's holiday season dates
    const year = startDate.getFullYear();
    const holidayStart = new Date(year, 10, 15); // Nov 15
    const holidayEnd = new Date(year + 1, 0, 5); // Jan 5 next year
    
    // Check for overlap
    return (startDate <= holidayEnd && endDate >= holidayStart);
  }

  function calculateDays(startDate, endDate) {
    if (!endDate) endDate = startDate;
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    const startDateTime = new Date(startDate).getTime();
    const endDateTime = new Date(endDate).getTime();
    const days = (endDateTime - startDateTime) / millisecondsPerDay;
    
    console.log('Days:', days)
    return days;
  }
}

function scoreAttraction(attraction, userPreferences) {
  let score = 0;
  let scoreEl = '<div class="ak-scores">';
  
  // 1. TRAVEL GROUP MATCH (+10 points)
  const bestFor = attraction.best_for.split(',');
  if (bestFor.includes(userPreferences.traveller) || bestFor.includes('all')) {
    // console.log('Best for::', bestFor.includes(userPreferences.traveller))
    // console.log('Best for::', bestFor.includes('all'))
    score += 10;
    scoreEl += `<div><b><i>Best_for:</i></b> <u>${bestFor}</u> <b><i>user_preference:</i></b> <u>${userPreferences.traveller}</u> (+10 points) current_score: <b>${score}</b></div>`;
  }
  else {
    scoreEl += `<div><b><i>Best_for:</i></b> <u>${bestFor}</u> <b><i>user_preference:</i></b> <u>${userPreferences.traveller}</u> (+10 points) current_score: <b>${score}</b></div>`;
  }
  
  // 2. INTEREST CATEGORY MATCH (+20 points per match)
  userPreferences.interests.forEach(interest => {
    // Convert form checkbox value to database category value
    const categoryValue = mapInterestToCategory(interest);
    
      // console.log('attraction.category::', attraction.category)
      // console.log('attraction.category_secondary::', attraction.category_secondary)
      // console.log('categoryValue::', categoryValue)
      
    if (attraction.category.includes(categoryValue)) {
      score += 20;
      scoreEl += `<div><b><i>Interests Category:</i></b> <u>${attraction.category}</u> <b><i>user_preference:</i></b> <u>${categoryValue}</u> (+20 points) current_score: <b>${score}</b></div>`;
    }
    if (attraction.category_secondary.includes(categoryValue)) {
      score += 20;
      scoreEl += `<div><b><i>Interests Category Secondary:</i></b> <u>${attraction.category_secondary}</u> <b><i>user_preference:</i></b> <u>${categoryValue}</u> (+20 points) current_score: <b>${score}</b></div>`;
    }
    if (!attraction.category.includes(categoryValue) && !attraction.category_secondary.includes(categoryValue)) {
      scoreEl += `<div><b><i>Interests Category:</i></b> <u>${attraction.category}</u> <b><i>user_preference:</i></b> <u>${categoryValue}</u> (+20 points) current_score: <b>${score}</b></div>`;
      scoreEl += `<div><b><i>Interests Category Secondary:</i></b> <u>${attraction.category_secondary}</u> <b><i>user_preference:</i></b> <u>${categoryValue}</u> (+20 points) current_score: <b>${score}</b></div>`;
    }
  });

  // console.log('attraction::', attraction)
  // console.log('attraction.budget_level::', attraction.budget_level)
  // console.log('userPreferences.budget::', userPreferences.budget)
  
  // 3. BUDGET MATCH (+10 points)
  /*const userPreferenceBudget = userPreferences.budget.trim().toLowerCase();
  if (userPreferenceBudget.includes(attraction.budget_level)) {
    score += 10;
    scoreEl += `<div><b><i>Budget:</i></b> <u>${attraction.budget_level}</u> <b><i>user_preference:</i></b> <u>${userPreferenceBudget}</u> (+10 points) current_score: <b>${score}</b></div>`;
  }
  else {
    scoreEl += `<div><b><i>Budget:</i></b> <u>${attraction.budget_level}</u> <b><i>user_preference:</i></b> <u>${userPreferenceBudget}</u> (+10 points) current_score: <b>${score}</b></div>`;
  }*/

  // console.log('attraction.neighborhood::', attraction.neighborhood)
  // console.log('userPreferences.neighborhood::', userPreferences.neighborhood)
  
  // 4. NEIGHBORHOOD PROXIMITY (+5 points)
  /*if (attraction.neighborhood.includes(userPreferences.neighborhood)) {
    score += 5;
    scoreEl += `<div><b><i>Neighborhood:</i></b> <u>${attraction.neighborhood}</u> <b><i>user_preference:</i></b> <u>${userPreferences.neighborhood}</u> (+5 points) current_score: <b>${score}</b></div>`;
  }
  else {
    scoreEl += `<div><b><i>Neighborhood:</i></b> <u>${attraction.neighborhood}</u> <b><i>user_preference:</i></b> <u>${userPreferences.neighborhood}</u> (+5 points) current_score: <b>${score}</b></div>`;
  }*/
  
  // 5. SEASON RATING (0-5 points)
  const dates = userPreferences.travelDates;
  const startDate = new Date(dates.split(/\s+to\s+/)[0]).toDateString(); // userPreferences.travelDates.start.toDateString(); 
  const season = getSeason(startDate);
  const seasonRating = attraction[`season_rating_${season}`];
  score += Number(seasonRating) || 0;
  scoreEl += `<div><b><i>Season:</i></b> ${season} (+${seasonRating} points) current_score: <b>${score}</b></div>`;

  // console.log('season::', season)
  // console.log('userPreferences.startDate::', userPreferences.startDate)
  // console.log('userPreferences::', userPreferences)   
  
  // 6. PACE COMPATIBILITY (+5 points)
  const paceOptions = attraction.pace_friendly.split(',');
  if (paceOptions.includes(userPreferences.pace)) {
    score += 5;
    scoreEl += `<div><b><i>Pace:</i></b> <u>${paceOptions}</u> <b><i>user_preference:</i></b> <u>${userPreferences.pace}</u> (+5 points) current_score: <b>${score}</b></div>`;
  }

  // console.log('attraction.pace_friendly::', attraction.pace_friendly)
  // console.log('paceOptions::', paceOptions)
  // console.log('userPreferences.pace::', userPreferences.pace_friendly)
  
  // 7. ICONIC BONUS (optional - for first-time visitors)
  // if (userPreferences.firstTimeVisitor && attraction.iconic === true) {
  //   score += 15;
  // }

  // console.log('============================')

  scoreEl += '</div>';
  
  return { score, scoreEl };

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
}

function getSeason(date) {
  const month = new Date(date).getMonth(); // 0-11
  if (month >= 2 && month <= 4) return 'spring';  // Mar-May
  if (month >= 5 && month <= 7) return 'summer';  // Jun-Aug
  if (month >= 8 && month <= 10) return 'fall';   // Sep-Nov
  return 'winter'; // Dec-Feb
}
