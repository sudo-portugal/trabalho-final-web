// /create-post.js (Este é o código de FRONTEND)

document.addEventListener("DOMContentLoaded", function() {

    // 1. Selecionar elementos do formulário
    const postForm = document.getElementById("create-post-form");
    const imageInput = document.getElementById("pet-image-upload");
    const imagePreviewContainer = document.getElementById("image-preview-container");
    const defaultPreviewImage = document.getElementById("image-preview");
    const submitButton = document.getElementById("submit-button");
    const loadingMessage = document.getElementById("loading-message");

    // 2. Ouvinte para preview de múltiplas imagens
    imageInput.addEventListener("change", function() {
        // Limpa previews antigos
        imagePreviewContainer.innerHTML = ''; 

        const files = this.files;
        if (files.length === 0) {
            // Se nenhum arquivo for selecionado, mostra a imagem padrão
            imagePreviewContainer.innerHTML = '<img src="/imgs/upload-img.png" alt="Selecione a imagem do seu cachorro." id="image-preview">';
            return;
        }

        // Loop para criar um preview para cada imagem
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.style.width = "100%"; // Ajusta o estilo do preview
                    img.style.height = "auto";
                    img.style.objectFit = "cover";
                    img.style.borderRadius = "15px";
                    img.style.marginBottom = "10px";
                    imagePreviewContainer.appendChild(img);
                }
                reader.readAsDataURL(file);
            }
        }
    });


    // 3. Ouvinte para o ENVIO (SUBMIT) do formulário
    postForm.addEventListener("submit", async function(event) {
        
        event.preventDefault(); 

        // Mostra feedback de carregamento
        submitButton.disabled = true;
        submitButton.style.opacity = 0.5;
        loadingMessage.style.display = 'block';

        // 4. Montar os dados com 'FormData'
        const formData = new FormData(postForm); // Pega todos os campos do form automaticamente

        // 5. Enviar os dados para o Backend (API)
        try {
            // A URL "/lost_dog_posts" é tratada pelo vercel.json
            const response = await fetch('/lost_dog_posts', {
                method: 'POST',
                body: formData 
            });

            if (response.ok) {
                alert("Post criado com sucesso!");
                window.location.href = "/lost-dog-menu.html"; // Redireciona
            } else {
                const errorData = await response.json();
                alert(`Erro ao criar o post: ${errorData.message || 'Tente novamente.'}`);
            }

        } catch (error) {
            console.error('Erro na requisição:', error);
            alert("Houve um erro de conexão. Verifique sua internet e tente novamente.");
        } finally {
            submitButton.disabled = false;
            submitButton.style.opacity = 1;
            loadingMessage.style.display = 'none';
        }
    });
});