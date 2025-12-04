document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id');
    const API_URL = 'https://back-end-tf-web-two.vercel.app';
  
    const mainContainer = document.querySelector('.content-box-post');
  
    const ensureUrlBase = (url) => {
        if (!url) return '/imgs/upload-img.png';
        if (url.startsWith('/imgs/')) return url;
        if (!url.startsWith('http')) return `https://ucarecdn.com/${url}`;
        return url;
    };
  
    if (!postId) {
      mainContainer.innerHTML = "<h1 style='text-align:center; margin-top:50px;'>Erro: ID do post não fornecido.</h1>";
      return;
    }
  
    try {
      const response = await fetch(`${API_URL}/lost_dog_posts/${postId}`);
      
      if (!response.ok) {
        throw new Error(`Post não encontrado (ID: ${postId})`);
      }
  
      const post = await response.json();
  
      document.title = `${post.pet_name} | MeuCachorroTáSumido`;
      document.getElementById('post-pet-name').textContent = post.pet_name;
      document.getElementById('post-pet-age').textContent = post.pet_age ? `Idade: ${post.pet_age}` : '';
      document.getElementById('post-description').textContent = post.description;
      
      if (post.whatsapp) {
        const whatsDiv = document.getElementById('social-whatsapp');
        whatsDiv.style.display = 'flex';
        whatsDiv.style.cursor = 'pointer';
        document.getElementById('post-whatsapp').textContent = post.whatsapp;
        
        const cleanNumber = post.whatsapp.replace(/\D/g, '');
        whatsDiv.onclick = () => window.open(`https://wa.me/55${cleanNumber}`, '_blank');
      }

      if (post.instagram) {
        const instaDiv = document.getElementById('social-instagram');
        instaDiv.style.display = 'flex';
        instaDiv.style.cursor = 'pointer';
        document.getElementById('post-instagram').textContent = post.instagram;
        
        const cleanUser = post.instagram.replace('@', '').trim();
        instaDiv.onclick = () => window.open(`https://instagram.com/${cleanUser}`, '_blank');
      }
  
      document.getElementById('post-breed').textContent = `Raça: ${post.breed}`;
      
      if (post.created_at) {
        const dataSumico = new Date(post.created_at).toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
        document.getElementById('post-created-at').textContent = `Sumiço: ${dataSumico}`;
      }
      
      document.getElementById('post-color').textContent = `Cor: ${post.color}`;
      document.getElementById('post-accessory').textContent = post.accessory ? `Adorno: ${post.accessory}` : '';
  
      document.getElementById('post-neighborhood').textContent = `Bairro: ${post.neighborhood}`;
      document.getElementById('post-adress').textContent = post.adress ? `Endereço: ${post.adress}` : '';
      document.getElementById('post-location-reference').textContent = post.location_reference ? `Referência: ${post.location_reference}` : '';
  
      const bigImgContainer = document.getElementById('big-img-container');
      const smallImgsContainer = document.getElementById('small-imgs-container');
      
      bigImgContainer.innerHTML = '';
      smallImgsContainer.innerHTML = '';
  
      let finalImagesList = [];
  
      if (post.images && post.images.length > 0) {
          post.images.forEach(imgObj => {
              let rawUrl = ensureUrlBase(imgObj.url);

              const groupMatch = rawUrl.match(/~(\d+)\/?$/);
  
              if (groupMatch) {
                  const count = parseInt(groupMatch[1]);
                  
               
                  let baseUrl = rawUrl;
                  if (!baseUrl.endsWith('/')) baseUrl += '/';
  

                  for (let i = 0; i < count; i++) {
                      finalImagesList.push(`${baseUrl}nth/${i}/`);
                  }
              } else {
                  finalImagesList.push(rawUrl);
              }
          });
      }
  
      if (finalImagesList.length > 0) {
        
        const bigImg = document.createElement('img');
        bigImg.src = finalImagesList[0];
        bigImg.alt = `Foto de ${post.pet_name}`;
        bigImg.onerror = () => { bigImg.src = '/imgs/upload-img.png'; };
        bigImgContainer.appendChild(bigImg);
  
        finalImagesList.forEach((imgUrl, index) => {
           const smallImgContainer = document.createElement('div');
           smallImgContainer.className = 'small-img-container';
  
           const smallImg = document.createElement('img');
           smallImg.src = imgUrl;
           smallImg.alt = `Thumbnail ${index}`;
           
           smallImgContainer.onclick = () => {
               bigImg.src = imgUrl;
           };
  
           smallImgContainer.appendChild(smallImg);
           smallImgsContainer.appendChild(smallImgContainer);
        });
  
      } else {
        bigImgContainer.innerHTML = '<img src="/imgs/upload-img.png" alt="Sem foto">';
      }
  
      const openModalBtn = document.getElementById('btn-open-delete-modal');
      const deleteModal = document.getElementById('delete-modal');
      const cancelBtn = document.getElementById('btn-cancel-delete');
      const confirmBtn = document.getElementById('btn-confirm-delete');
      const passwordInput = document.getElementById('delete-password-input');
      const feedbackMsg = document.getElementById('delete-feedback-message');
  
      if (openModalBtn) {
        openModalBtn.addEventListener('click', () => {
          deleteModal.style.display = 'flex';
          passwordInput.value = ''; 
          feedbackMsg.style.display = 'none';
        });
      }
  
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          deleteModal.style.display = 'none';
        });
      }
  
      if (deleteModal) {
        deleteModal.addEventListener('click', (e) => {
          if (e.target === deleteModal) deleteModal.style.display = 'none';
        });
      }
  
      if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
          const password = passwordInput.value;
    
          if (password.length === 0) {
            feedbackMsg.textContent = 'Por favor, digite a senha.';
            feedbackMsg.style.color = 'red';
            feedbackMsg.style.display = 'block';
            return;
          }
    
          feedbackMsg.textContent = 'Verificando e deletando...';
          feedbackMsg.style.color = 'black';
          feedbackMsg.style.display = 'block';
          confirmBtn.disabled = true;
    
          try {
            const deleteResponse = await fetch(`${API_URL}/lost_dog_posts/${postId}`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ password: password })
            });
    
            const result = await deleteResponse.json();
    
            if (!deleteResponse.ok) {
              throw new Error(result.error || 'Falha ao deletar post.');
            }
    
            feedbackMsg.textContent = 'Post deletado! Redirecionando...';
            feedbackMsg.style.color = 'green';
            
            setTimeout(() => {
              window.location.href = '/lost-dog-menu.html';
            }, 2000);
    
          } catch (err) {
            feedbackMsg.textContent = `Erro: ${err.message}`;
            feedbackMsg.style.color = 'red';
            confirmBtn.disabled = false; 
          }
        });
      }
  
    } catch (error) {
      console.error('Erro ao carregar o post:', error);
      mainContainer.innerHTML = `<h1>Erro ao carregar o post.</h1><p>${error.message}</p>`;
    }
});