document.addEventListener("DOMContentLoaded", async () => {

  const dogMenu = document.querySelector(".dog-menu");

  dogMenu.innerHTML = '<p class="loading-message">Carregando posts, por favor aguarde...</p>';

  try {
    const response = await fetch('/lost_dog_posts');

    if (!response.ok) {
      throw new Error(`Erro na requisição: ${response.statusText}`);
    }

    const posts = await response.json();

    dogMenu.innerHTML = '';

    if (posts.length === 0) {
      dogMenu.innerHTML = '<p class="loading-message">Nenhum post encontrado.</p>';
      return;
    }

    posts.forEach(post => {
      const postElement = document.createElement('div');
      postElement.className = 'found-dog-container';

      const imageUrl = (post.images && post.images.length > 0) 
                       ? post.images[0].url 
                       : '/imgs/upload-img.png';
      
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
    dogMenu.innerHTML = '<p class="loading-message" style="color: red;">Erro ao carregar posts. Tente recarregar a página.</p>';
  }
});