// Global variabel för att lagra all hämtad data
let allHolidays = [];
const BASE_API_URL = 'https://date.nager.at/api/v3/';
const FIXED_YEAR = '2026'; // Hårdkodat år för helgdagarna

// Lista över europeiska länder
const EUROPEAN_COUNTRIES = [
  'AL', 'AD', 'AT', 'BY', 'BE', 'BA', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI',
  'FR', 'DE', 'GR', 'HU', 'IS', 'IE', 'IT', 'XK', 'LV', 'LI', 'LT', 'LU', 'MT',
  'MD', 'MC', 'ME', 'NL', 'MK', 'NO', 'PL', 'PT', 'RO', 'RU', 'SM', 'RS', 'SK',
  'SI', 'ES', 'SE', 'CH', 'UA', 'GB', 'VA'
];

// DOM-element referenser
const loadingElement = document.getElementById('loading');
const errorElement = document.getElementById('error-message');
const noResultsElement = document.getElementById('no-results');
const holidaysContainer = document.getElementById('holidaysContainer');
const initialMessage = document.getElementById('initialMessage');
const countrySelect = document.getElementById('countrySelect');
const nameFilterInput = document.getElementById('nameFilterInput');
const sortSelect = document.getElementById('sortSelect');

function updateUIState(state) {
  // Dölj alla tillståndselement först
  loadingElement.classList.add('hidden');
  errorElement.classList.add('hidden');
  noResultsElement.classList.add('hidden');
  initialMessage.classList.add('hidden');

  // Rensa containern endast om vi inte går till 'success' (där renderHolidays sköter det)
  if (state !== 'success' && state !== 'no_filter_match') {
    holidaysContainer.innerHTML = '';
  }

  // Visa det relevanta elementet
  switch (state) {
    case 'loading':
      loadingElement.classList.remove('hidden');
      break;
    case 'error':
      errorElement.classList.remove('hidden');
      break;
    case 'initial':
      initialMessage.classList.remove('hidden');
      break;
    case 'no_filter_match':
      // Detta tillstånd hanteras vanligtvis inuti renderHolidays om listan är tom p.g.a. filter
      noResultsElement.classList.remove('hidden');
      break;
    case 'success':
      // Inget att visa, helgdagarna renderas i containern
      break;
  }
}

function createHolidayCard(holiday, countryCode) {
  // Formatera datum till lång svensk sträng (t.ex. "torsdag, 1 januari 2026")
  const date = new Date(holiday.date).toLocaleDateString('sv-SE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const currentCountryCode = countryCode.toLowerCase();
  const flagUrl = `https://flagcdn.com/w20/${currentCountryCode}.png`;

  // SVG för jordgloben (används för engelskt namn)
  const planetIcon = `<svg class="icon-planet" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        <line x1="2.1" y1="12" x2="21.9" y2="12"></line>
    </svg>`;

  // Flagg-ikon
  const flagIcon = `<img src="${flagUrl}" alt="Flagga" class="icon-flag" onerror="this.style.display='none'">`;

  return `
        <div class="holiday-card">
            <div>
                <h2>
                    ${flagIcon} ${holiday.localName}
                </h2>
                <p>
                    ${planetIcon} ${holiday.name}
                </p>
            </div>
            <div class="text-right">
                <p>${date}</p>
            </div>
        </div>
    `;
}

function renderHolidays(holidayList) {
  holidaysContainer.innerHTML = ''; // Rensa föregående resultat

  // Om listan är tom, kolla om det är p.g.a. filter eller tomt API-svar
  if (holidayList.length === 0) {
    if (nameFilterInput.value.trim() !== '') {
      updateUIState('no_filter_match');
    } else {
      // Detta hanterar både initialt läge och tomt API-svar
      const selectedCountryText = countrySelect.options[countrySelect.selectedIndex] ? countrySelect.options[countrySelect.selectedIndex].text : 'valt land';
      holidaysContainer.innerHTML = `<p class="initial-message">
                Inga nationella helgdagar hittades för ${selectedCountryText} år ${FIXED_YEAR}.
            </p>`;
      updateUIState('success'); // Behandla som framgångsrik tomt lista
    }
    return;
  }

  updateUIState('success');

  const currentCountryCode = countrySelect.value;

  // Bygg HTML-strängen för alla kort och injicera
  const allCardsHTML = holidayList.map(holiday => createHolidayCard(holiday, currentCountryCode)).join('');
  holidaysContainer.innerHTML = allCardsHTML;
}

async function fetchAvailableCountries() {
  try {
    const response = await fetch(`${BASE_API_URL}AvailableCountries`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const countries = await response.json();

    // Filtrera endast till europeiska länder
    const europeanCountries = countries.filter(country =>
      EUROPEAN_COUNTRIES.includes(country.countryCode)
    );

    // Rensa "Laddar länder..." och lägg till standardalternativ
    countrySelect.innerHTML = '<option value="" disabled selected>Välj ett land...</option>';
    countrySelect.disabled = false; // Aktivera dropdown

    // Fyll på med de europeiska länderna
    europeanCountries.forEach(country => {
      const option = document.createElement('option');
      option.value = country.countryCode;
      option.textContent = country.name;
      countrySelect.appendChild(option);
    });

  } catch (error) {
    console.error("Kunde inte ladda länder:", error);
    countrySelect.innerHTML = '<option value="" disabled selected>Kunde inte ladda länder</option>';
  }
}

// FUNKTION FÖR SORTERING
function handleSort() {
  const sortValue = sortSelect.value;

  // Se till att det finns data att sortera
  if (allHolidays.length === 0) {
    // Om vi är i initialt läge/tom lista, finns inget att sortera.
    // Låt handleFilter hantera rendering om sökfältet är ifyllt
    handleFilter();
    return;
  }

  // Sortera den globala listan
  allHolidays.sort((a, b) => {
    switch (sortValue) {
      case 'date-asc':
        // Jämför datum (tidigast först)
        return new Date(a.date) - new Date(b.date);

      case 'date-desc':
        // Jämför datum (senaste först)
        return new Date(b.date) - new Date(a.date);

      case 'name-asc':
        // Jämför namn (A-Ö), använder svensk sortering
        return a.localName.localeCompare(b.localName, 'sv', { sensitivity: 'base' });

      case 'name-desc':
        // Jämför namn (Ö-A), använder svensk sortering
        return b.localName.localeCompare(a.localName, 'sv', { sensitivity: 'base' });

      default:
        return 0; // Ingen sortering
    }
  });

  // När allHolidays är sorterad, anropa handleFilter.
  // handleFilter kommer att filtrera (om sökfältet är ifyllt) och sedan anropa renderHolidays
  handleFilter();
}


async function fetchHolidays() {
  const countryCode = countrySelect.value;
  const year = FIXED_YEAR; // Använd det fasta året

  // Återställ sökfältet och filter
  nameFilterInput.value = '';

  if (!countryCode || countryCode === '') {
    updateUIState('initial');
    return;
  }

  updateUIState('loading');

  try {
    const url = `${BASE_API_URL}PublicHolidays/${year}/${countryCode}`;
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        // API returnerar 404 om inga helgdagar hittas för landet/året
        allHolidays = [];
        // Om listan är tom, använd renderHolidays direkt för att visa meddelande
        renderHolidays([]);
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } else {
      allHolidays = await response.json();

      // ANROPAR handleSort() ISTÄLLET FÖR renderHolidays() DIREKT.
      // handleSort() kommer att sortera allHolidays och sedan anropa handleFilter(),
      // som i sin tur anropar renderHolidays().
      handleSort();
    }

  } catch (error) {
    console.error("Fel vid hämtning av helgdagar:", error);
    updateUIState('error');
  }
}

function handleFilter() {
  const searchTerm = nameFilterInput.value.toLowerCase().trim();

  if (searchTerm === '') {
    renderHolidays(allHolidays); // Visa alla (sorterade) om sökfältet är tomt
    return;
  }

  // Filtrera den fullständiga listan av helgdagar (allHolidays)
  const filteredHolidays = allHolidays.filter(holiday =>
    holiday.localName.toLowerCase().includes(searchTerm) ||
    holiday.name.toLowerCase().includes(searchTerm)
  );

  renderHolidays(filteredHolidays);
}

// Kör funktionen för att ladda länderna när sidan laddats
document.addEventListener('DOMContentLoaded', () => {
  fetchAvailableCountries();
  // Visa det initiala meddelandet i väntan på att ett land väljs
  updateUIState('initial');
});
