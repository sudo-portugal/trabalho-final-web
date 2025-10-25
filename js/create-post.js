import express from "express";
import pkg from "pg";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import multer from "multer"; // Para processar FormData (arquivos)

// --- NOVOS ---
// Precisamos desses módulos para lidar com caminhos de arquivos locais
import path from "path";
import { fileURLToPath } from "url";
// ----------------

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const { Pool } = pkg;

// --- NOVOS ---
// Isso é necessário para usar __dirname com ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// ----------------

// Middlewares
app.use(express.json()); // Para rotas que recebem JSON (ex: login)

// --- NOVO: Servir arquivos estáticos ---
// Isso torna a pasta 'public' acessível publicamente.
// Agora, o frontend pode acessar as imagens salvas em '/uploads/nome-da-imagem.png'
app.use(express.static(path.join(__dirname, '..', 'public')));
// ------------------------------------

// --- ALTERADO: CONFIGURAÇÃO DO MULTER ---
// Trocamos 'memoryStorage' por 'diskStorage'
const storage = multer.diskStorage({
  // Define a pasta de destino
  destination: function (req, file, cb) {
    // Salva na pasta 'public/uploads' que criamos
    cb(null, path.join(__dirname, '..', 'public', 'uploads'));
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
  // ... (sua rota / está ótima, sem mudanças)
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
  // ... (sua rota GET /lost_dog_posts está perfeita, sem mudanças)
  // Ela já busca as imagens da tabela 'post_images'
  try {
    const query = `
      SELECT 
        p.id, p.pet_name, p.description, p.breed, p.color, p.neighborhood,
        p.accessory, p.location_reference, p.whatsapp, p.instagram,
        p.created_at, p.pet_age, p.adress,
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
// --- ROTA DE CRIAÇÃO DE POST (MODIFICADA) ---
// =================================================================
app.post('/lost_dog_posts', upload.array('images'), async (req, res) => {
  
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

  const files = req.files;

  // Validações (sem mudança)
  if (!pet_name || !description || !breed || !color || !neighborhood || !password) {
    return res.status(400).json({
      error: 'Campos obrigatórios faltando: pet_name, description, breed, color, neighborhood, password.',
    });
  }

  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'Você deve enviar pelo menos uma imagem.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Inserir post (sem mudança)
    const insertPostQuery = `
      INSERT INTO lost_dog_posts (
        pet_name, description, breed, color, neighborhood, 
        accessory, location_reference, whatsapp, instagram, 
        pet_age, password, adress
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id;
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
    const newPostId = postResult.rows[0].id;

    // --- ALTERADO: Salvar imagens localmente ---
    const uploadedImageUrls = [];
    
    for (const file of files) {
      // 1. O 'multer' já salvou o arquivo na pasta 'public/uploads'.
      // 2. O 'file.filename' contém o nome único que geramos (ex: "images-123456-789.png").
      // 3. Criamos a URL que o frontend vai usar.
      const imageUrl = `/uploads/${file.filename}`; // Ex: /uploads/images-12345-6789.png
      
      uploadedImageUrls.push(imageUrl);

      // 4. Salva a URL local no banco de dados
      const insertImageQuery = `
        INSERT INTO post_images (post_id, image_url)
        VALUES ($1, $2)
      `;
      await client.query(insertImageQuery, [newPostId, imageUrl]);
    }
    // -----------------------------------------

    await client.query('COMMIT');

    res.status(201).json({
      message: "Post criado com sucesso!",
      postId: newPostId,
      images: uploadedImageUrls,
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar post:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  } finally {
    client.release();
  }
});

app.listen(port, () => {
  console.log(`Serviço rodando na porta: ${port}`);
});