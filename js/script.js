// Variabel för att lagra all hämtad data, vilket är viktigt för att kunna filtrera och sortera listan utan att hämta ny data från API:et varje gång.
let allHolidays = [];

// URL:en som används för att hämta datan från externa API:et.
const BASE_API_URL = 'https://date.nager.at/api/v3/';

// Det fasta året som applikationen fokuserar på.
const FIXED_YEAR = '2026';

// Lista över europeiska länder som används för att filtrera API:ets svar så att endast de europeiska länderna kan väljas och visas.
const EUROPEAN_COUNTRIES = [
  'AL', 'AD', 'AT', 'BY', 'BE', 'BA', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI',
  'FR', 'DE', 'GR', 'HU', 'IS', 'IE', 'IT', 'XK', 'LV', 'LI', 'LT', 'LU', 'MT',
  'MD', 'MC', 'ME', 'NL', 'MK', 'NO', 'PL', 'PT', 'RO', 'RU', 'SM', 'RS', 'SK',
  'SI', 'ES', 'SE', 'CH', 'UA', 'GB', 'VA'
];

// Referenspekare till alla viktiga HTML-element som hämtar referenser med hjälp av deras ID.
const loadingElement = document.getElementById('loading'); //Meddelande som visas under laddning.
const errorElement = document.getElementById('error-message'); // Meddelande som visas vid fel.
const noResultsElement = document.getElementById('no-results'); //Meddelande vid ingen filtermatch.
const holidaysContainer = document.getElementById('holidaysContainer'); //Container där helgdagskorten renderas.
const initialMessage = document.getElementById('initialMessage'); // Det första meddelandet innan land är valt.
const countrySelect = document.getElementById('countrySelect'); // Rullgardinsmenyn för val av land.
const nameFilterInput = document.getElementById('nameFilterInput'); // Textfältet för sökning och filtrering
const sortSelect = document.getElementById('sortSelect'); // Rullgardinsmenyn för sortering.

// Funktion som uppdaterar användargränssnittets tillstånd och hanterar vilka statusmeddelanden som ska vara synliga.
function updateUIState(state) {

  // Dölj alla tillståndselement först, för att säkerställa att bara det korrekta visas.
  loadingElement.classList.add('hidden');
  errorElement.classList.add('hidden');
  noResultsElement.classList.add('hidden');
  initialMessage.classList.add('hidden');

  // Rensar containern endast om det inte går till success. Vid success sköter funktionen renderHolidays det istället.
  if (state !== 'success' && state !== 'no_filter_match') {
    holidaysContainer.innerHTML = '';
  }

  // Visar det relevanta elementet baserat på angivet tillstånd.
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
      noResultsElement.classList.remove('hidden');
      break;
    case 'success': // Betyder att data har hämtats och att inget extra meddelande behövs.
      break;
  }
}

//Funktion som skapar strukturen för ett helgdagskort
function createHolidayCard(holiday, countryCode) {

  // Formatera datum till en svensk sträng (t.ex. "torsdag, 1 januari 2026")
  const date = new Date(holiday.date).toLocaleDateString('sv-SE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  // Bygger URL till en extern plats där flaggor hämtas.
  const currentCountryCode = countryCode.toLowerCase();
  const flagUrl = `https://flagcdn.com/w20/${currentCountryCode}.png`;

  // SVG-kod för jordglobsikonen som visas bredvid det engelska namnet.
  const planetIcon = `<svg class="icon-planet" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        <line x1="2.1" y1="12" x2="21.9" y2="12"></line>
    </svg>`;

  // Flagg-ikonen
  const flagIcon = `<img src="${flagUrl}" alt="Flagga" class="icon-flag" onerror="this.style.display='none'">`;

  //Returnerar hela helgdagskortets HTML-struktur.
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

// Funktion som renderar listan av helgdagskort, samt hanterar speciella fall så som tomma listor.
function renderHolidays(holidayList) {
  holidaysContainer.innerHTML = ''; // Rensa föregående resultat och befintlig HTML i containern.

//Kontrollerar och hanterar om listan är tom.
  if (holidayList.length === 0) {
    if (nameFilterInput.value.trim() !== '') { //
      updateUIState('no_filter_match');
    } else {
      const selectedCountryText = countrySelect.options[countrySelect.selectedIndex] ? countrySelect.options[countrySelect.selectedIndex].text : 'valt land';
      holidaysContainer.innerHTML = `<p class="initial-message">
                Inga nationella helgdagar hittades för ${selectedCountryText} år ${FIXED_YEAR}.
            </p>`;
      updateUIState('success'); // Behandlar detta som en lyckad laddning av en tom lista.
    }
    return;
  }
  updateUIState('success');
  const currentCountryCode = countrySelect.value;

  // Bygger HTML-strängen för alla helgdagskort och injicerar all HTML i containern.
  const allCardsHTML = holidayList.map(holiday => createHolidayCard(holiday, currentCountryCode)).join('');
  holidaysContainer.innerHTML = allCardsHTML;
}

// Funktion som asynkront hämtar listan över tillgängliga länder från API:et och fyller rullgardinsmenyn.
async function fetchAvailableCountries() {
  try {
    // Gör ett API-anrop för att få alla länder.
    const response = await fetch(`${BASE_API_URL}AvailableCountries`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const countries = await response.json();

    // Filtrerar mot listan european_countries för att endast visa länder i Europa.
    const europeanCountries = countries.filter(country =>
      EUROPEAN_COUNTRIES.includes(country.countryCode)
    );

    // Rensa och återställer rullgardinmenyn när länderna är laddade.
    countrySelect.innerHTML = '<option value="" disabled selected>Välj ett land...</option>';
    countrySelect.disabled = false;

    // Itererar över den filtrerade listan och skapar ett element för varje land.
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

// Funktion som hanterar sorteringslogiken baserat på användarens val i rullgardinsmenyn. Sorterar allHolidays och triggar sedan en uppdatering.
function handleSort() {
  const sortValue = sortSelect.value;

  // Se till att det finns data att sortera och avbryta om det inte finns någon data. Låter handleFilter hantera rendering om sökfältet är ifyllt
  if (allHolidays.length === 0) {
    handleFilter();
    return;
  }

  // Använder jämförelsefunktion för att sortera listan
  allHolidays.sort((a, b) => {
    switch (sortValue) {
      case 'date-asc':
        // Jämför datum (tidigast först)
        return new Date(a.date) - new Date(b.date);

      case 'date-desc':
        // Jämför datum (senaste först)
        return new Date(b.date) - new Date(a.date);

      case 'name-asc':
        // Jämför namn (A-Ö)
        return a.localName.localeCompare(b.localName, 'sv', { sensitivity: 'base' });

      case 'name-desc':
        // Jämför namn (Ö-A)
        return b.localName.localeCompare(a.localName, 'sv', { sensitivity: 'base' });

      default:
        return 0; // Ingen sortering
    }
  });

  // När allHolidays är sorterad, anropas handleFilter för att applicera sorteringen på de synliga resultaten.
  handleFilter();
}

//Asynkron funktion som hämtar de nationella helgdagarna för det valda landet. Funktionen anropas när användaren väljer ett nytt land.
async function fetchHolidays() {
  const countryCode = countrySelect.value;
  const year = FIXED_YEAR;

  nameFilterInput.value = '';  // Återställer sökfältet när ett nytt land väljs, så att inga gamla filter är aktiva.

  if (!countryCode || countryCode === '') {
    // Om inget land är vald, visas det initiala meddelandet.
    updateUIState('initial');
    return;
  }

  updateUIState('loading'); //Visar laddningsmeddelandet.

  try {
    const url = `${BASE_API_URL}PublicHolidays/${year}/${countryCode}`;
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        allHolidays = [];
        renderHolidays([]);
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } else {
      //Hämtar data och sparar den i variabeln.
      allHolidays = await response.json();

      // Anropar sortering. Istället för att rendera direkt sorteras listan först. handleSort kommer att sortera allHolidays och sedan anropa handleFilter, som i sin tur anropar renderHolidays().
      // Detta säkerställer att data är sorterad enligt standard eller vald sortering när den visas.
      handleSort();
    }

  } catch (error) {
    console.error("Fel vid hämtning av helgdagar:", error);
    updateUIState('error');
  }
}

//Funktion som haterar filtreringen av helgdagar baserat på textinmatning. Denna funktion anpropas varje gång något skrivs i sökfältet.
function handleFilter() {
  const searchTerm = nameFilterInput.value.toLowerCase().trim();

  if (searchTerm === '') {
    //Om sökfältet är tomt visas hela den sorterade listan.
    renderHolidays(allHolidays);
    return;
  }

  // Filtrera den fullständiga listan av helgdagar. Kontrollerar om söktermen finns i antingen det lokala namnet eller det engelska namnet.
  const filteredHolidays = allHolidays.filter(holiday =>
    holiday.localName.toLowerCase().includes(searchTerm) ||
    holiday.name.toLowerCase().includes(searchTerm)
  );

  //Renderar den nya, filtrerade listan.
  renderHolidays(filteredHolidays);
}

// Kör funktionen när hela HTML-dokumentet har laddats klart.
document.addEventListener('DOMContentLoaded', () => {
  //Laddar länderna till rullgardinsmenyn först.
  fetchAvailableCountries();
  // Visa det initiala meddelandet i väntan på att ett land väljs.
  updateUIState('initial');
});
