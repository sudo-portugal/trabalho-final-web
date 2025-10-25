document.addEventListener("DOMContentLoaded", async () => {
  // Pega o ID do post da URL
  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get('id');

  const mainContainer = document.querySelector('.content-box-post');

  if (!postId) {
    mainContainer.innerHTML = "<h1>Erro: ID do post não fornecido.</h1>";
    return;
  }

  try {
    // Busca os dados do post
    const response = await fetch(`/lost_dog_posts/${postId}`);
    
    if (!response.ok) {
      throw new Error(`Post não encontrado (ID: ${postId})`);
    }

    const post = await response.json();

    // --- Preenche os dados de Texto ---
    document.getElementById('post-pet-name').textContent = post.pet_name;
    document.getElementById('post-pet-age').textContent = post.pet_age ? `Idade: ${post.pet_age}` : '';
    document.getElementById('post-description').textContent = post.description;
    
    // Contatos
    if (post.whatsapp) {
      document.getElementById('social-whatsapp').style.display = 'flex';
      document.getElementById('post-whatsapp').textContent = post.whatsapp;
    }
    if (post.instagram) {
      document.getElementById('social-instagram').style.display = 'flex';
      document.getElementById('post-instagram').textContent = post.instagram;
    }

    // Detalhes da direita
    document.getElementById('post-breed').textContent = `Raça: ${post.breed}`;
    
    const dataSumico = new Date(post.created_at).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
    document.getElementById('post-created-at').textContent = `Sumiço: ${dataSumico}`;
    
    document.getElementById('post-color').textContent = `Cor: ${post.color}`;
    document.getElementById('post-accessory').textContent = post.accessory ? `Adorno: ${post.accessory}` : '';

    // Localização
    document.getElementById('post-neighborhood').textContent = `Bairro: ${post.neighborhood}`;
    document.getElementById('post-adress').textContent = post.adress ? `Endereço: ${post.adress}` : '';
    document.getElementById('post-location-reference').textContent = post.location_reference ? `Referência: ${post.location_reference}` : '';

    // --- Preenche as Imagens ---
    const bigImgContainer = document.getElementById('big-img-container');
    const smallImgsContainer = document.getElementById('small-imgs-container');
    
    bigImgContainer.innerHTML = '';
    smallImgsContainer.innerHTML = '';

    if (post.images && post.images.length > 0) {
      const firstImageUrl = post.images[0].url;
      const bigImg = document.createElement('img');
      bigImg.src = firstImageUrl;
      bigImg.alt = `Foto de ${post.pet_name}`;
      bigImgContainer.appendChild(bigImg);

      post.images.forEach(image => {
        const smallImgContainer = document.createElement('div');
        smallImgContainer.className = 'small-img-container';
        const smallImg = document.createElement('img');
        smallImg.src = image.url;
        smallImg.alt = "Thumbnail";
        smallImg.addEventListener('click', () => { bigImg.src = image.url; });
        smallImgContainer.appendChild(smallImg);
        smallImgsContainer.appendChild(smallImgContainer);
      });
    } else {
      bigImgContainer.innerHTML = '<img src="/imgs/upload-img.png" alt="Sem foto">';
    }

    // ===============================================
    // --- NOVO: LÓGICA DO MODAL DE DELEÇÃO ---
    // ===============================================

    // 1. Pega os elementos do DOM
    const openModalBtn = document.getElementById('btn-open-delete-modal');
    const deleteModal = document.getElementById('delete-modal');
    const cancelBtn = document.getElementById('btn-cancel-delete');
    const confirmBtn = document.getElementById('btn-confirm-delete');
    const passwordInput = document.getElementById('delete-password-input');
    const feedbackMsg = document.getElementById('delete-feedback-message');

    // 2. Abrir o modal
    openModalBtn.addEventListener('click', () => {
      deleteModal.style.display = 'flex';
      passwordInput.value = ''; // Limpa a senha
      feedbackMsg.style.display = 'none'; // Esconde msg anterior
    });

    // 3. Fechar o modal (botão Cancelar)
    cancelBtn.addEventListener('click', () => {
      deleteModal.style.display = 'none';
    });

    // 4. Fechar o modal (clicando fora)
    deleteModal.addEventListener('click', (e) => {
      if (e.target === deleteModal) { // Se o clique foi no overlay escuro
        deleteModal.style.display = 'none';
      }
    });

    // 5. Confirmar a exclusão
    confirmBtn.addEventListener('click', async () => {
      const password = passwordInput.value;

      if (password.length === 0) {
        feedbackMsg.textContent = 'Por favor, digite a senha.';
        feedbackMsg.style.color = 'red';
        feedbackMsg.style.display = 'block';
        return;
      }

      // Mostra feedback de carregamento
      feedbackMsg.textContent = 'Verificando e deletando...';
      feedbackMsg.style.color = 'black';
      feedbackMsg.style.display = 'block';
      confirmBtn.disabled = true;

      try {
        const deleteResponse = await fetch(`/lost_dog_posts/${postId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ password: password })
        });

        const result = await deleteResponse.json();

        if (!deleteResponse.ok) {
          // Se for 403 (Senha incorreta) ou outro erro do servidor
          throw new Error(result.error || 'Falha ao deletar post.');
        }

        // Sucesso!
        feedbackMsg.textContent = 'Post deletado! Redirecionando...';
        feedbackMsg.style.color = 'green';
        
        // Redireciona para a página inicial
        setTimeout(() => {
          window.location.href = '/lost-dog-menu.html'; // ou '/'
        }, 2000);

      } catch (err) {
        feedbackMsg.textContent = `Erro: ${err.message}`;
        feedbackMsg.style.color = 'red';
        confirmBtn.disabled = false; // Reabilita o botão
      }
    });

    // ===============================================
    // --- FIM DA LÓGICA DO MODAL ---
    // ===============================================

  } catch (error) {
    console.error('Erro ao carregar o post:', error);
    mainContainer.innerHTML = `<h1>Erro ao carregar o post.</h1><p>${error.message}</p>`;
  }
});