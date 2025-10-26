const API_KEY = '225a70afe36a3ba053130f7194015d1d';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';
let currentItem;

async function fetchTrending(type) {
  const res = await fetch(`${BASE_URL}/trending/${type}/week?api_key=${API_KEY}`);
  const data = await res.json();
  return data.results;
}

async function fetchTrendingAnime() {
  let allResults = [];
  for (let page = 1; page <= 3; page++) {
    const res = await fetch(`${BASE_URL}/trending/tv/week?api_key=${API_KEY}&page=${page}`);
    const data = await res.json();
    const filtered = data.results.filter(item =>
      item.original_language === 'ja' && item.genre_ids.includes(16)
    );
    allResults = allResults.concat(filtered);
  }
  return allResults;
}

function displayBanner(item) {
  const banner = document.getElementById('banner');
  if (item && item.backdrop_path) {
    banner.style.setProperty(
      "background",
      `linear-gradient(to top,rgba(20,20,20,1) 0%,rgba(20,20,20,0.4) 80%),url(${IMG_URL}${item.backdrop_path}) center/cover no-repeat`
    );
    banner.style.setProperty("--banner-img", `url(${IMG_URL}${item.backdrop_path})`);
  } else {
    banner.style.background = '#232323';
  }
  document.getElementById('banner-title').textContent = item?.title || item?.name || "";
  document.getElementById('banner-overview').textContent = item?.overview || "";
}

function displayList(items, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  items.forEach(item => {
    if (!item.poster_path) return;
    const img = document.createElement('img');
    img.src = `${IMG_URL}${item.poster_path}`;
    img.alt = item.title || item.name;
    img.onclick = () => showDetails(item);
    container.appendChild(img);
  });
}

function showDetails(item) {
  currentItem = item;
  document.getElementById('modal-title').textContent = item.title || item.name;
  document.getElementById('modal-description').textContent = item.overview;
  document.getElementById('modal-image').src = item.poster_path
    ? `${IMG_URL}${item.poster_path}`
    : 'fallback.jpg';
  document.getElementById('modal-rating').innerHTML = '★'.repeat(Math.round(item.vote_average / 2));
  changeServer();
  document.getElementById('modal').style.display = 'flex';
}

function changeServer() {
  const server = document.getElementById('server').value;
  const type = currentItem.media_type === "movie" ? "movie" : "tv";
  let embedURL = "";
  if (server === "vidsrc.cc") {
    embedURL = `https://vidsrc.cc/v2/embed/${type}/${currentItem.id}`;
  } else if (server === "vidsrc.me") {
    embedURL = `https://vidsrc.net/embed/${type}/?tmdb=${currentItem.id}`;
  } else if (server === "player.videasy.net") {
    embedURL = `https://player.videasy.net/${type}/${currentItem.id}`;
  }
  document.getElementById('modal-video').src = embedURL;
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
  document.getElementById('modal-video').src = '';
}

function openSearchModal() {
  document.getElementById('search-modal').style.display = 'flex';
  document.getElementById('search-input').focus();
}

function closeSearchModal() {
  document.getElementById('search-modal').style.display = 'none';
  document.getElementById('search-results').innerHTML = '';
}

async function searchTMDB() {
  const query = document.getElementById('search-input').value;
  if (!query.trim()) {
    document.getElementById('search-results').innerHTML = '';
    return;
  }
  const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}`);
  const data = await res.json();
  const container = document.getElementById('search-results');
  container.innerHTML = '';
  data.results.forEach(item => {
    if (!item.poster_path) return;
    const img = document.createElement('img');
    img.src = `${IMG_URL}${item.poster_path}`;
    img.alt = item.title || item.name;
    img.onclick = () => {
      closeSearchModal();
      showDetails(item);
    };
    container.appendChild(img);
  });
}

/* Nav toggle logic for section filtering */
function setActiveNav(navId) {
  document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
  document.getElementById(navId).classList.add('active');
}

document.addEventListener('DOMContentLoaded', async () => {
  const movies = await fetchTrending('movie');
  const tvShows = await fetchTrending('tv');
  const anime = await fetchTrendingAnime();

  displayBanner(movies[Math.floor(Math.random() * movies.length)]);
  displayList(movies, 'movies-list');
  displayList(tvShows, 'tvshows-list');
  displayList(anime, 'anime-list');

  // Navigation logic
  document.getElementById('nav-home').onclick = e => {
    e.preventDefault();
    setActiveNav('nav-home');
    document.getElementById('row-home').style.display = '';
    document.getElementById('row-tv').style.display = '';
    document.getElementById('row-anime').style.display = '';
  };
  document.getElementById('nav-tv').onclick = e => {
    e.preventDefault();
    setActiveNav('nav-tv');
    document.getElementById('row-home').style.display = 'none';
    document.getElementById('row-tv').style.display = '';
    document.getElementById('row-anime').style.display = 'none';
  };
  document.getElementById('nav-movies').onclick = e => {
    e.preventDefault();
    setActiveNav('nav-movies');
    document.getElementById('row-home').style.display = '';
    document.getElementById('row-tv').style.display = 'none';
    document.getElementById('row-anime').style.display = 'none';
  };
  document.getElementById('nav-popular').onclick = e => {
    e.preventDefault();
    setActiveNav('nav-popular');
    document.getElementById('row-home').style.display = '';
    document.getElementById('row-tv').style.display = 'none';
    document.getElementById('row-anime').style.display = '';
  };
});

