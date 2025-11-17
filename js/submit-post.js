document.addEventListener("DOMContentLoaded", () => {

  const imageInput = document.getElementById("pet-image-upload");
  const imageContainer = document.getElementById("image-preview-container");

  if (imageInput && imageContainer) {
    imageInput.addEventListener("change", function () {
      const files = this.files;

      imageContainer.innerHTML = "";

      if (files.length > 0) {
        Array.from(files).forEach((file) => {
          if (file.type.startsWith("image/")) {
            const reader = new FileReader();

            reader.onload = function (e) {
              const img = document.createElement("img");
              img.src = e.target.result;
              
              img.classList.add("preview-thumb"); 
              
              imageContainer.appendChild(img);
            };

            reader.readAsDataURL(file);
          }
        });
      } else {
        imageContainer.innerHTML =
          '<img src="/imgs/upload-img.png" alt="Selecione a imagem" id="image-preview">';
      }
    });
  }

  const postForm = document.getElementById("create-post-form");
  const submitButton = document.getElementById("submit-button");

  let feedbackMessage = document.querySelector(".feedback-message");
  if (!feedbackMessage && postForm) {
      feedbackMessage = document.createElement("p");
      feedbackMessage.className = "feedback-message";
      postForm.appendChild(feedbackMessage);
  }

  if (postForm) {
    postForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      feedbackMessage.textContent = "Enviando post, por favor aguarde...";
      feedbackMessage.style.color = "black";
      submitButton.disabled = true;

      try {
        const formData = new FormData(postForm);
        const response = await fetch("/lost_dog_posts", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (!response.ok) throw new Error(result.error || "Falha ao criar o post.");

        feedbackMessage.textContent = "Post criado com sucesso! Redirecionando...";
        feedbackMessage.style.color = "green";

        setTimeout(() => window.location.href = "/lost-dog-menu.html", 2000);

      } catch (error) {
        console.error("Erro:", error);
        feedbackMessage.textContent = `Erro: ${error.message}`;
        feedbackMessage.style.color = "red";
        submitButton.disabled = false;
      }
    });
  }
});