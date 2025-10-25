import express from "express";
import pkg from "pg";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const { Pool } = pkg;

app.use(express.json());

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
  try {
    const query = `
      SELECT 
        id, pet_name, description, breed, color, neighborhood,
        accessory, location_reference, whatsapp, instagram,
        created_at, pet_age, adress
      FROM lost_dog_posts
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar posts:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

app.post('/lost_dog_posts', async (req, res) => {
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

  if (!pet_name || !description || !breed || !color || !neighborhood || !password) {
    return res.status(400).json({
      error: 'Campos obrigatórios faltando: pet_name, description, breed, color, neighborhood, password.',
    });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const insertQuery = `
      INSERT INTO lost_dog_posts (
        pet_name, description, breed, color, neighborhood, 
        accessory, location_reference, whatsapp, instagram, 
        pet_age, password, adress
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *; 
    `;

    const values = [
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

    const result = await pool.query(insertQuery, values);

    const newPost = result.rows[0];
    delete newPost.password;

    res.status(201).json(newPost);
  } catch (err) {
    console.error('Erro ao criar post:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

app.listen(port, () => {
  console.log(`Serviço rodando na porta: ${port}`);
});
