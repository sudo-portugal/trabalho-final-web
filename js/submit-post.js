document.addEventListener("DOMContentLoaded", () => {
  // 1. Pegue o formulário
  // IMPORTANTE: Adicione o id="create-post-form" na sua tag <form>
  const postForm = document.getElementById("create-post-form");
  
  // 2. Pegue o botão "Concluir"
  // IMPORTANTE: Adicione o id="submit-button" na sua tag <button>
  const submitButton = document.getElementById("submit-button");

  // 3. Crie um elemento para mensagens de feedback
  const feedbackMessage = document.createElement("p");
  feedbackMessage.className = "feedback-message";
  postForm.appendChild(feedbackMessage); // Adiciona a mensagem no final do form

  // 4. Adicione o "escutador" de evento ao formulário
  if (postForm) {
    postForm.addEventListener("submit", async (e) => {
      // Previne o recarregamento da página
      e.preventDefault(); 

      // Mostra feedback e desabilita o botão
      feedbackMessage.textContent = "Enviando post, por favor aguarde...";
      feedbackMessage.style.color = "black";
      submitButton.disabled = true;

      try {
        // 5. Cria o FormData direto do formulário
        // Isso só funciona se seus <input> tiverem o atributo "name"
        // Ex: <input name="pet_name" ...>
        // Ex: <input name="password" ...>
        // Ex: <input name="images" type="file" multiple ...>
        const formData = new FormData(postForm);

        // 6. Envia os dados para o seu BACKEND
        const response = await fetch('/lost_dog_posts', {
          method: 'POST',
          body: formData,
          // Não precisa de 'Content-Type', o browser faz isso
        });

        const result = await response.json();

        if (!response.ok) {
          // Mostra erros do servidor (Ex: "Campos faltando...")
          throw new Error(result.error || 'Falha ao criar o post.');
        }

        // 7. Sucesso!
        feedbackMessage.textContent = "Post criado com sucesso! Redirecionando...";
        feedbackMessage.style.color = "green";
        
        // Redireciona para a página inicial após 2 segundos
        setTimeout(() => {
          window.location.href = '/'; // Ou '/index.html'
        }, 2000);

      } catch (error) {
        // 8. Falha
        console.error('Erro no envio do formulário:', error);
        feedbackMessage.textContent = `Erro: ${error.message}`;
        feedbackMessage.style.color = "red";
        submitButton.disabled = false; // Habilita o botão de novo
      }
    });
  }
});