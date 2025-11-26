document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('create-post-form');
    const loadingMessage = document.getElementById('loading-message');
    const submitButton = document.getElementById('submit-button');
    
    // O UPLOADCARE_PUBLIC_KEY DEVE ESTAR NO HTML

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        loadingMessage.style.display = 'block';
        submitButton.disabled = true;

        const formData = new FormData(form);
        const postData = {};

        // Coletar dados do formulário, convertendo para um objeto JSON
        for (const [key, value] of formData.entries()) {
            if (key === 'images_urls') {
                // O Uploadcare retorna os UUIDs/URLs separados por nova linha ('\n')
                postData[key] = value.split('\n').filter(url => url.trim() !== '');
            } else {
                postData[key] = value;
            }
        }
        
        // Objeto final a ser enviado como JSON
        const requestBody = {
            ...postData,
            images_urls: postData.images_urls || []
        };
        
        // Validação de Imagens
        if (requestBody.images_urls.length === 0) {
            alert('Por favor, envie pelo menos uma imagem usando o seletor.');
            loadingMessage.style.display = 'none';
            submitButton.disabled = false;
            return;
        }

        try {
            // Enviar os dados via fetch
            const response = await fetch('https://back-end-tf-web-two.vercel.app/lost_dog_posts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json', // Mudar para JSON
                },
                body: JSON.stringify(requestBody), // Enviar o objeto JSON
            });

            const result = await response.json();

            if (response.ok) {
                alert('Post criado com sucesso! ID: ' + result.postId);
                window.location.href = '/lost-dog-menu.html';
            } else {
                alert('Erro ao criar post: ' + (result.error || 'Ocorreu um erro desconhecido.'));
            }

        } catch (error) {
            console.error('Erro de rede:', error);
            alert('Erro de conexão com o servidor. Tente novamente. Verifique se o domínio do back-end está correto.');
        } finally {
            loadingMessage.style.display = 'none';
            submitButton.disabled = false;
        }
    });
});