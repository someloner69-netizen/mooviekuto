const API_KEY = '225a70afe36a3ba053130f7194015d1d';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';
// Global variable for currently selected item, necessary for server change
let currentItem = null; 
const searchInput = document.getElementById('search-input');
const searchResultsContainer = document.getElementById('search-results');
const modalElement = document.getElementById('modal');
const searchModalElement = document.getElementById('search-modal');
const serverSelect = document.getElementById('server');

/**
 * Utility function for basic error handling during fetching.
 * @param {string} url - The URL to fetch.
 * @returns {Promise<any>} The JSON response data.
 */
async function fetchData(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP error! Status: ${res.status}`);
    }
    return res.json();
  } catch (error) {
    console.error('API Fetch Error:', error);
    return { results: [] };
  }
}

// Optimization: Combined functions into a single reusable one
async function fetchTrending(type) {
  const data = await fetchData(`${BASE_URL}/trending/${type}/week?api_key=${API_KEY}`);
  return data.results || [];
}

// Optimization: Enhanced error handling in anime fetching
async function fetchTrendingAnime() {
  let allResults = [];
  const fetchPromises = [];
  
  // Use Promise.all to fetch pages concurrently
  for (let page = 1; page <= 3; page++) {
    fetchPromises.push(fetchData(`${BASE_URL}/discover/tv?api_key=${API_KEY}&with_genres=16&with_original_language=ja&sort_by=popularity.desc&page=${page}`));
  }
  
  const results = await Promise.all(fetchPromises);
  
  // Flatten and filter results
  results.forEach(data => {
    // Note: Switched to discover endpoint for more precise filtering than trending.
    // TMDB genre ID for 'Animation' is 16.
    allResults = allResults.concat(data.results || []);
  });
  
  // Filter out duplicates based on id (common in multi-page fetching)
  const uniqueAnime = Array.from(new Set(allResults.map(a => a.id)))
    .map(id => allResults.find(a => a.id === id));
    
  return uniqueAnime;
}

function displayBanner(item) {
  const banner = document.getElementById('banner');
  const fallbackBg = '#232323';
  
  if (item && item.backdrop_path) {
    const bannerUrl = `${IMG_URL}${item.backdrop_path}`;
    // Optimization: Pre-load the image before setting the style for smoother transition
    const img = new Image();
    img.onload = () => {
        banner.style.setProperty(
          "background",
          `linear-gradient(to top,rgba(20,20,20,1) 0%,rgba(20,20,20,0.4) 80%),url(${bannerUrl}) center/cover no-repeat`
        );
        banner.style.setProperty("--banner-img", `url(${bannerUrl})`);
    };
    img.onerror = () => {
        banner.style.background = fallbackBg;
    }
    img.src = bannerUrl;
  } else {
    banner.style.background = fallbackBg;
  }
  
  document.getElementById('banner-title').textContent = item?.title || item?.name || "";
  document.getElementById('banner-overview').textContent = item?.overview || "No overview available.";
}

function displayList(items, containerId) {
  const container = document.getElementById(containerId);
  // Optimization: Use a document fragment for faster DOM manipulation
  const fragment = document.createDocumentFragment();
  
  items.forEach(item => {
    if (!item.poster_path) return;
    const img = document.createElement('img');
    img.src = `${IMG_URL}${item.poster_path}`;
    img.alt = item.title || item.name || 'Movie/TV Poster';
    // Optimization: Added lazy loading for better performance
    img.loading = 'lazy'; 
    // Optimization: Use event listeners in JS, not inline HTML
    img.addEventListener('click', () => showDetails(item));
    fragment.appendChild(img);
  });
  
  container.innerHTML = ''; // Clear existing content
  container.appendChild(fragment); // Append all new elements at once
}

function showDetails(item) {
  currentItem = item;
  const ratingStars = Math.round(item.vote_average / 2);
  
  document.getElementById('modal-title').textContent = item.title || item.name;
  document.getElementById('modal-description').textContent = item.overview || "Overview not available.";
  document.getElementById('modal-image').src = item.poster_path
    ? `${IMG_URL}${item.poster_path}`
    : 'fallback.jpg';
  document.getElementById('modal-image').alt = item.title || item.name || 'Poster';
  document.getElementById('modal-rating').innerHTML = '★'.repeat(ratingStars);
  document.getElementById('modal-rating').setAttribute('aria-label', `Rating: ${ratingStars} out of 5 stars`);
  
  // Use a reliable default server if none is selected
  serverSelect.value = serverSelect.value || 'vidsrc.cc';
  updateEmbed();
  
  // Optimization: Use class toggling for CSS transition
  modalElement.classList.add('show');
  // Optional: Focus the close button for accessibility 
  modalElement.querySelector('.close').focus(); 
}

// Optimization: Renamed for clarity, handles the server change logic
function updateEmbed() {
  if (!currentItem) return; 
  const server = serverSelect.value;
  const type = currentItem.media_type === "movie" ? "movie" : "tv";
  let embedURL = "";
  
  switch (server) {
    case "vidsrc.cc":
      embedURL = `https://vidsrc.cc/v2/embed/${type}/${currentItem.id}`;
      break;
    case "vidsrc.me":
      embedURL = `https://vidsrc.net/embed/${type}/?tmdb=${currentItem.id}`;
      break;
    case "player.videasy.net":
      embedURL = `https://player.videasy.net/${type}/${currentItem.id}`;
      break;
    default:
      console.warn("Unknown server selected.");
      return;
  }
  document.getElementById('modal-video').src = embedURL;
}

function closeModal() {
  // Optimization: Use class toggling for CSS transition
  modalElement.classList.remove('show');
  document.getElementById('modal-video').src = ''; // Stop video playback
}

function openSearchModal() {
  // Optimization: Use class toggling for CSS transition
  searchModalElement.classList.add('show');
  searchInput.focus();
}

function closeSearchModal() {
  // Optimization: Use class toggling for CSS transition
  searchModalElement.classList.remove('show');
  // Clear the search field and results when closing
  searchInput.value = '';
  searchResultsContainer.innerHTML = '';
}

/**
 * Debounce utility function to limit how often a function is called.
 * @param {Function} func - The function to debounce.
 * @param {number} delay - The delay in milliseconds.
 * @returns {Function} A debounced function.
 */
function debounce(func, delay) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

async function searchTMDB() {
  const query = searchInput.value.trim();
  if (!query) {
    searchResultsContainer.innerHTML = '';
    return;
  }
  
  const data = await fetchData(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}`);
  
  searchResultsContainer.innerHTML = '';
  const fragment = document.createDocumentFragment();
  
  (data.results || []).forEach(item => {
    // Filter out items without a poster or irrelevant media types
    if (!item.poster_path || (item.media_type !== 'movie' && item.media_type !== 'tv')) return;
    
    const img = document.createElement('img');
    img.src = `${IMG_URL}${item.poster_path}`;
    img.alt = item.title || item.name || 'Search Result Poster';
    img.loading = 'lazy';
    img.addEventListener('click', () => {
      closeSearchModal();
      showDetails(item);
    });
    fragment.appendChild(img);
  });
  
  searchResultsContainer.appendChild(fragment);
}

// Optimization: Debounced search function to limit API calls
const debouncedSearch = debounce(searchTMDB, 300);

/* Nav toggle logic for section filtering */
function setActiveNav(navId) {
  document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
  document.getElementById(navId).classList.add('active');
}

/**
 * Handles navigation clicks to toggle section visibility.
 * @param {string} targetId - The ID of the section to primarily show.
 * @param {Array<string>} showIds - Array of section IDs to display.
 */
function handleNavClick(navId, showIds) {
  setActiveNav(navId);
  const allRows = ['row-home', 'row-tv', 'row-anime'];
  allRows.forEach(rowId => {
    const displayStyle = showIds.includes(rowId) ? '' : 'none';
    document.getElementById(rowId).style.display = displayStyle;
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  // Optimization: Use Promise.all for concurrent data fetching
  const [movies, tvShows, anime] = await Promise.all([
    fetchTrending('movie'),
    fetchTrending('tv'),
    fetchTrendingAnime()
  ]);

  // Display content
  if (movies.length) {
      displayBanner(movies[Math.floor(Math.random() * movies.length)]);
      displayList(movies, 'movies-list');
  }
  displayList(tvShows, 'tvshows-list');
  displayList(anime, 'anime-list');
  
  // --- Event Listeners and Delegation ---
  
  // Navbar search bar: open modal on focus or click
  document.getElementById('navbar-search').addEventListener('focus', openSearchModal);
  
  // Search input inside modal: call debounced search function
  searchInput.addEventListener('input', debouncedSearch);

  // Modal server selector
  serverSelect.addEventListener('change', updateEmbed);

  // Modal close buttons using event delegation
  document.addEventListener('click', (e) => {
      if (e.target.dataset.action === 'close-modal') {
          closeModal();
      } else if (e.target.dataset.action === 'close-search-modal') {
          closeSearchModal();
      }
  });
  
  // Navigation logic using helper function
  document.getElementById('nav-home').addEventListener('click', (e) => {
    e.preventDefault();
    handleNavClick('nav-home', ['row-home', 'row-tv', 'row-anime']);
  });
  document.getElementById('nav-tv').addEventListener('click', (e) => {
    e.preventDefault();
    handleNavClick('nav-tv', ['row-tv']);
  });
  document.getElementById('nav-movies').addEventListener('click', (e) => {
    e.preventDefault();
    handleNavClick('nav-movies', ['row-home']);
  });
  document.getElementById('nav-popular').addEventListener('click', (e) => {
    e.preventDefault();
    handleNavClick('nav-popular', ['row-home', 'row-anime']);
  });
  
  // Handle ESC key to close modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (modalElement.classList.contains('show')) {
            closeModal();
        } else if (searchModalElement.classList.contains('show')) {
            closeSearchModal();
        }
    }
  });
});
