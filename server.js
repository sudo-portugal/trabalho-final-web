import express from "express";
import pkg from "pg";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import multer from "multer"; // Para processar FormData (arquivos)
import fs from 'fs/promises'; // <-- ADICIONE ISSO PARA DELETAR ARQUIVOS
import path from "path"; // Para lidar com caminhos de arquivos
import { fileURLToPath } from "url"; // Para lidar com caminhos

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const { Pool } = pkg;

// --- Configuração de Caminhos ---
// Isso é necessário para usar __dirname com ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// --------------------------------

// --- Middlewares ---
app.use(express.json()); // Para rotas que recebem JSON (ex: login)

// Isso torna a pasta 'public' acessível publicamente.
// O frontend poderá acessar as imagens em '/uploads/nome-da-imagem.png'
app.use(express.static(path.join(__dirname, 'public')));

// Isso torna a pasta raiz acessível para servir seu index.html, css e js
// Assumindo que server.js está na raiz (se estiver em /js, mude para path.join(__dirname, '..'))
app.use(express.static(path.join(__dirname)));
// --------------------

// --- CONFIGURAÇÃO DO MULTER (Upload Local) ---
const storage = multer.diskStorage({
  // Define a pasta de destino
  destination: function (req, file, cb) {
    // Salva na pasta 'public/uploads' que criamos
    cb(null, path.join(__dirname, 'public', 'uploads'));
  },
  // Define o nome do arquivo
  filename: function (req, file, cb) {
    // Cria um nome único para evitar sobrescrever arquivos
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });
// ---------------------------------------

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

// ROTA PARA BUSCAR OS POSTS (O MENU)
app.get('/lost_dog_posts', async (req, res) => {
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

// ROTA PARA CRIAR NOVOS POSTS
app.post('/lost_dog_posts', upload.array('images'), async (req, res) => {

  // 1. Os dados de TEXTO vêm de 'req.body' (graças ao Multer)
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

  // 2. Os ARQUIVOS vêm de 'req.files'
  const files = req.files;

  // 3. Validação
  if (!pet_name || !description || !breed || !color || !neighborhood || !password) {
    return res.status(400).json({
      error: 'Campos obrigatórios faltando: pet_name, description, breed, color, neighborhood, password.',
    });
  }

  // Validação de contato (baseada no seu erro anterior do banco)
  if (!whatsapp && !instagram) {
    return res.status(400).json({
      error: 'Você deve fornecer pelo menos um método de contato (WhatsApp ou Instagram).',
    });
  }

  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'Você deve enviar pelo menos uma imagem.' });
  }

  // 4. Iniciar a Transação com o banco
  const client = await pool.connect();

  try {
    // Inicia a transação
    await client.query('BEGIN');

    // 5. Criptografar a senha
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 6. Inserir os dados de TEXTO na tabela 'lost_dog_posts'
    const insertPostQuery = `
      INSERT INTO lost_dog_posts (
        pet_name, description, breed, color, neighborhood, 
        accessory, location_reference, whatsapp, instagram, 
        pet_age, password, adress
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id; -- Retorna apenas o ID do post
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

    // 7. Salvar as imagens no banco 'post_images'
    const uploadedImageUrls = [];

    for (const file of files) {
      // O multer já salvou o arquivo em 'public/uploads'
      // 'file.filename' é o nome único (ex: images-123456.png)
      // Criamos a URL que o frontend vai usar:
      const imageUrl = `/uploads/${file.filename}`;

      uploadedImageUrls.push(imageUrl);

      // Salva a URL local no banco de dados, vinculada ao post
      const insertImageQuery = `
        INSERT INTO post_images (post_id, image_url)
        VALUES ($1, $2)
      `;
      await client.query(insertImageQuery, [newPostId, imageUrl]);
    }

    // 8. Se tudo deu certo, "commita" a transação
    await client.query('COMMIT');

    // 9. Envia a resposta de sucesso para o frontend
    res.status(201).json({
      message: "Post criado com sucesso!",
      postId: newPostId,
      images: uploadedImageUrls,
    });

  } catch (err) {
    // 10. Se algo deu errado, "cancela" a transação (ROLLBACK)
    await client.query('ROLLBACK');

    // Mostra o erro real no terminal
    console.error('Erro ao criar post:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  } finally {
    // 11. Libera o cliente do banco de dados
    client.release();
  }
}); // <-- A ROTA POST TERMINA AQUI.


// ROTA PARA BUSCAR UM ÚNICO POST (AGORA NO LUGAR CORRETO)
app.get('/lost_dog_posts/:id', async (req, res) => {
  // Pega o ID que veio na URL (ex: /lost_dog_posts/123)
  const { id } = req.params;

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
      WHERE p.id = $1; -- AQUI ESTÁ A MUDANÇA: busca por ID
    `;

    const result = await pool.query(query, [id]);

    // Verifica se encontrou um post
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post não encontrado.' });
    }

    // Retorna o post encontrado (só o primeiro, pois ID é único)
    res.status(200).json(result.rows[0]);

  } catch (err) {
    console.error('Erro ao buscar post individual:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});


// ROTA PARA DELETAR UM POST (NOVO!)
app.delete('/lost_dog_posts/:id', async (req, res) => {
  const { id } = req.params;
  const { password } = req.body; // Vamos receber a senha do modal aqui

  if (!password) {
    return res.status(400).json({ error: 'Senha é obrigatória.' });
  }

  const client = await pool.connect();

  try {
    // 1. Buscar o post e a senha HASHED dele
    const selectQuery = 'SELECT password FROM lost_dog_posts WHERE id = $1';
    const postResult = await client.query(selectQuery, [id]);

    if (postResult.rows.length === 0) {
      return res.status(404).json({ error: 'Post não encontrado.' });
    }

    const storedHashedPassword = postResult.rows[0].password;

    // 2. Comparar a senha enviada com a senha no banco
    const isMatch = await bcrypt.compare(password, storedHashedPassword);

    if (!isMatch) {
      // Se a senha não bate, retorna "Proibido"
      return res.status(403).json({ error: 'Senha incorreta.' });
    }

    // 3. Se a senha BATEU, deletar o post (em uma transação)
    await client.query('BEGIN');

    // 3a. Pegar o nome dos arquivos de imagem para deletar do disco
    const imageQuery = 'SELECT image_url FROM post_images WHERE post_id = $1';
    const imagesResult = await client.query(imageQuery, [id]);
    const imageUrls = imagesResult.rows.map(row => row.image_url);

    // 3b. Deletar as referências das imagens no banco
    await client.query('DELETE FROM post_images WHERE post_id = $1', [id]);
    
    // 3c. Deletar o post principal
    await client.query('DELETE FROM lost_dog_posts WHERE id = $1', [id]);

    // 3d. Confirmar a transação
    await client.query('COMMIT');

    // 4. Deletar os arquivos físicos do servidor (depois do commit)
    for (const url of imageUrls) {
      try {
        const filename = url.split('/').pop(); // Pega "imagem.png" de "/uploads/imagem.png"
        const filePath = path.join(__dirname, 'public', 'uploads', filename);
        await fs.unlink(filePath); // Deleta o arquivo
        console.log(`Arquivo deletado: ${filePath}`);
      } catch (fileErr) {
        console.error(`Erro ao deletar arquivo ${url}:`, fileErr.message);
        // Não paramos o processo, o post já foi deletado do banco
      }
    }
    
    // 5. Enviar sucesso
    res.status(200).json({ message: 'Post deletado com sucesso.' });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao deletar post:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  } finally {
    client.release();
  }
});

// Inicia o servidor (AGORA NO LUGAR CORRETO)
app.listen(port, () => {
  console.log(`Serviço rodando na porta: ${port}`);
});