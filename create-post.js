// /create-post.js (CÓDIGO DE FRONTEND)

document.addEventListener("DOMContentLoaded", function() {

    const postForm = document.getElementById("create-post-form");
    const imageInput = document.getElementById("pet-image-upload");
    const imagePreviewContainer = document.getElementById("image-preview-container");
    const submitButton = document.getElementById("submit-button");
    const loadingMessage = document.getElementById("loading-message");

    imageInput.addEventListener("change", function() {
        imagePreviewContainer.innerHTML = ''; 
        const files = this.files;
        if (files.length === 0) {
            imagePreviewContainer.innerHTML = '<img src="/imgs/upload-img.png" alt="Selecione a imagem do seu cachorro." id="image-preview">';
            return;
        }

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.style.width = "100%";
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

    postForm.addEventListener("submit", async function(event) {
        event.preventDefault(); 
        submitButton.disabled = true;
        submitButton.style.opacity = 0.5;
        loadingMessage.style.display = 'block';

        // Pega todos os campos do form automaticamente
        const formData = new FormData(postForm); 

        try {
            // Chama a nova URL da API
            const response = await fetch('/lost_dog_posts', {
                method: 'POST',
                body: formData 
            });

            if (response.ok) {
                alert("Post criado com sucesso!");
                window.location.href = "/lost-dog-menu.html";
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