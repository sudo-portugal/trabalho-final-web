document.addEventListener("DOMContentLoaded", () => {
  const dogMenu = document.querySelector(".dog-menu");
  const API_URL = 'https://back-end-tf-web-two.vercel.app'; 
  
  const applyFiltersBtn = document.getElementById('apply-filters-btn');
  const clearFiltersBtn = document.getElementById('clear-filters-btn');
  const filterBreed = document.getElementById('filter-breed');
  const filterNeighborhood = document.getElementById('filter-neighborhood');
  const filterColor = document.getElementById('filter-color');

  const formatImageUrl = (url) => {
    if (!url || url.startsWith('/imgs/')) {
      return url; 
    }
    
    let formattedUrl = url;

    if (!formattedUrl.startsWith('http')) {
      formattedUrl = `https://ucarecdn.com/${formattedUrl}`;
    }

    if (formattedUrl.includes('~') && !formattedUrl.includes('/nth/')) {
      if (!formattedUrl.endsWith('/')) {
        formattedUrl += '/';
      }
      formattedUrl += 'nth/0/';
    }
    
    return formattedUrl;
  };

  const loadPosts = async () => {
    // 1. Coletar valores dos filtros
    const breed = filterBreed.value.trim();
    const neighborhood = filterNeighborhood.value.trim();
    const color = filterColor.value.trim();
    
    // 2. Construir Query Parameters
    const params = new URLSearchParams();

    if (breed) {
        params.append('breed', breed);
    }
    if (neighborhood) {
        params.append('neighborhood', neighborhood);
    }
    if (color) {
        params.append('color', color);
    }
    
    const queryString = params.toString();
    const fetchUrl = `${API_URL}/lost_dog_posts${queryString ? '?' + queryString : ''}`;

    dogMenu.innerHTML = '<p class="loading-message">Carregando posts, por favor aguarde...</p>';

    try {
      const response = await fetch(fetchUrl);

      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.statusText}`);
      }

      const posts = await response.json();

      dogMenu.innerHTML = '';

      if (posts.length === 0) {
        dogMenu.innerHTML = '<p class="loading-message">Nenhum post encontrado com esses filtros.</p>';
        return;
      }

      posts.forEach(post => {
        const postElement = document.createElement('div');
        postElement.className = 'found-dog-container';

        const rawUrl = (post.images && post.images.length > 0) 
                           ? post.images[0].url 
                           : '/imgs/upload-img.png';
        
        const imageUrl = formatImageUrl(rawUrl);
        
        const altText = `Foto de ${post.pet_name || 'cachorro perdido'}`;

        postElement.innerHTML = `
          <div class="found-dog-photo">
            <img src="${imageUrl}" alt="${altText}">
          </div>
          <div class="found-dog-desc">
            <h2>Nome: ${post.pet_name}</h2>
            <p class="dog-desc">Raça: ${post.breed}</p>
            <p class="dog-desc">Bairro: ${post.neighborhood}</p>
          </div>
          <div class="found-dog-confirm">
            <a href="/lost-dog-post.html?id=${post.id}"> 
              <button class="btn-found-dog"> Esse é o meu cachorro</button> 
            </a>
          </div>
        `;

        dogMenu.appendChild(postElement);
      });

    } catch (error) {
      console.error('Erro ao carregar posts:', error);
      dogMenu.innerHTML = '<p class="loading-message" style="color: red;">Erro ao carregar posts. Tente novamente.</p>';
    }
  };

  const clearFilters = () => {
    filterBreed.value = '';
    filterNeighborhood.value = '';
    filterColor.value = '';
    loadPosts();
  };

  applyFiltersBtn.addEventListener('click', loadPosts);
  clearFiltersBtn.addEventListener('click', clearFilters);

  loadPosts();
});