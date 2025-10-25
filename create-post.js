import express from "express";
import pkg from "pg";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

// --- NOVOS IMPORTS ---
import multer from "multer"; // Para processar FormData (arquivos)
import { put } from "@vercel/blob"; // Para fazer upload para o Vercel Blob
// ----------------------

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const { Pool } = pkg;

// Middlewares
// express.json() é para rotas que recebem JSON (ex: login de admin)
app.use(express.json()); 

// --- CONFIGURAÇÃO DO MULTER ---
// Usamos 'memoryStorage' para manter o arquivo na memória RAM
// antes de enviá-lo para o Vercel Blob.
const upload = multer({ storage: multer.memoryStorage() });
// -----------------------------

const pool = new Pool({
  connectionString: process.env.URL_BD,
  ssl: {
    rejectUnauthorized: false,
  },
});

app.get("/", async (req, res) => {
  console.log("Rota GET / solicitada");
  let dbStatus = "ok";
  try {
    await pool.query("SELECT 1");
  } catch (e) {
    dbStatus = e.message;
  }
  res.json({
    descricao: "API para MeuCachorroTaSumido",
    autor: "Indivíduos Computaria",
    statusBD: dbStatus
  });
});

app.get('/lost_dog_posts', async (req, res) => {
  // Esta rota está ótima, mas precisa retornar as imagens também.
  // Vamos fazer um JOIN.
  try {
    const query = `
      SELECT 
        p.id, p.pet_name, p.description, p.breed, p.color, p.neighborhood,
        p.accessory, p.location_reference, p.whatsapp, p.instagram,
        p.created_at, p.pet_age, p.adress,
        -- Agrega todas as URLs de imagem em um array de JSON
        COALESCE(
          (SELECT json_agg(json_build_object('id', i.id, 'url', i.image_url))
           FROM post_images i WHERE i.post_id = p.id),
          '[]'::json
        ) as images
      FROM lost_dog_posts p
      ORDER BY p.created_at DESC
    `;
    const result = await pool.query(query);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar posts:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// =================================================================
// --- ROTA DE CRIAÇÃO DE POST (TOTALMENTE REFEITA) ---
// =================================================================
// 1. Usamos 'upload.array("images")'
//    "images" DEVE ser o mesmo nome usado no formData.append('images', ...) do frontend
app.post('/lost_dog_posts', upload.array('images'), async (req, res) => {
  
  // 2. Os dados de TEXTO agora vêm de 'req.body' (graças ao Multer)
  const {
    pet_name,
    description,
    breed,
    color,
    neighborhood,
    accessory,
    location_reference,
    whatsapp,
    instagram,
    pet_age,
    password,
    adress,
  } = req.body;

  // 3. Os ARQUIVOS vêm de 'req.files'
  const files = req.files;

  // 4. Validação (incluindo a imagem)
  if (!pet_name || !description || !breed || !color || !neighborhood || !password) {
    return res.status(400).json({
      error: 'Campos obrigatórios faltando: pet_name, description, breed, color, neighborhood, password.',
    });
  }

  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'Você deve enviar pelo menos uma imagem.' });
  }

  // 5. Iniciar uma "Transação" com o banco de dados.
  // Isso garante que SÓ salvaremos o post se as imagens também forem salvas.
  // Se o upload da imagem falhar, nós cancelamos a criação do post.
  const client = await pool.connect();

  try {
    // Inicia a transação
    await client.query('BEGIN');

    // 6. Criptografar a senha
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 7. Inserir os dados de TEXTO na tabela 'lost_dog_posts'
    const insertPostQuery = `
      INSERT INTO lost_dog_posts (
        pet_name, description, breed, color, neighborhood, 
        accessory, location_reference, whatsapp, instagram, 
        pet_age, password, adress
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id; -- Retorna apenas o ID do post que acabamos de criar
    `;
    const postValues = [
      pet_name,
      description,
      breed,
      color,
      neighborhood,
      accessory,
      location_reference,
      whatsapp,
      instagram,
      pet_age,
      hashedPassword,
      adress,
    ];

    const postResult = await client.query(insertPostQuery, postValues);
    const newPostId = postResult.rows[0].id; // Pegamos o ID do novo post

    // 8. Fazer o upload das imagens E salvar no banco 'post_images'
    const uploadedImageUrls = [];
    
    for (const file of files) {
      // 8a. Faz o upload do arquivo (que está na memória/buffer) para o Vercel Blob
      const { url } = await put(
        `posts/${newPostId}/${file.originalname}`, // Caminho do arquivo
        file.buffer, // O conteúdo do arquivo
        { access: 'public' } // Define a imagem como pública
      );
      
      uploadedImageUrls.push(url);

      // 8b. Salva a URL da imagem no banco de dados, vinculada ao post
      const insertImageQuery = `
        INSERT INTO post_images (post_id, image_url)
        VALUES ($1, $2)
      `;
      await client.query(insertImageQuery, [newPostId, url]);
    }

    // 9. Se tudo deu certo (post e imagens salvos), "commita" a transação
    await client.query('COMMIT');

    // 10. Envia a resposta de sucesso para o frontend
    res.status(201).json({
      message: "Post criado com sucesso!",
      postId: newPostId,
      images: uploadedImageUrls,
    });

  } catch (err) {
    // 11. Se algo deu errado, "cancela" a transação (ROLLBACK)
    // Isso desfaz o 'INSERT' do post, mantendo o banco limpo.
    await client.query('ROLLBACK');
    
    console.error('Erro ao criar post:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  } finally {
    // 12. Libera o cliente do banco de dados de volta para o "pool"
    client.release();
  }
});

app.listen(port, () => {
  console.log(`Serviço rodando na porta: ${port}`);
});