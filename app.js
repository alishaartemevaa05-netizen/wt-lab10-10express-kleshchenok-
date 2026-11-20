const express = require("express");
const pool = require("./db");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Справочники для валидации
const CATEGORIES = ["Economy", "Comfort", "Business", "Suv", "Minivan"];
const TRANSMISSIONS = ["Manual", "Automatic"];
const FUEL_TYPES = ["Petrol", "Diesel", "Electric", "Hybrid"];

// Столбцы для выборки (с camelCase-псевдонимами)
const CAR_COLUMNS = `
  "Id" AS "id",
  "Brand" AS "brand",
  "Model" AS "model",
  "Year" AS "year",
  "Category" AS "category",
  "Transmission" AS "transmission",
  "FuelType" AS "fuelType",
  "Seats" AS "seats",
  "DailyPrice"::float8 AS "dailyPrice",
  "IsAvailable" AS "isAvailable",
  "Description" AS "description",
  "Color" AS "color"
`;

function parseId(value) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

function validateCar(b) {
    const errors = [];
    if (!b.brand || typeof b.brand !== "string") errors.push("brand: обязательная строка");
    if (!b.model || typeof b.model !== "string") errors.push("model: обязательная строка");
    if (!Number.isInteger(b.year) || b.year < 1990 || b.year > 2030) errors.push("year: от 1990 до 2030");
    if (!CATEGORIES.includes(b.category)) errors.push("category: одно из " + CATEGORIES.join(", "));
    if (!TRANSMISSIONS.includes(b.transmission)) errors.push("transmission: одно из " + TRANSMISSIONS.join(", "));
    if (!FUEL_TYPES.includes(b.fuelType)) errors.push("fuelType: одно из " + FUEL_TYPES.join(", "));
    if (!Number.isInteger(b.seats) || b.seats < 2 || b.seats > 9) errors.push("seats: от 2 до 9");
    if (typeof b.dailyPrice !== "number" || b.dailyPrice < 1 || b.dailyPrice > 10000) errors.push("dailyPrice: от 1 до 10000");
    if (typeof b.isAvailable !== "boolean") errors.push("isAvailable: true или false");
    return errors;
}

function sendDbError(res, error, message) {
    console.error(error);
    if (error.code === "23503") {
        return res.status(409).json({ error: "Операция невозможна: есть связанные записи (аренды)" });
    }
    res.status(500).json({ error: message });
}

// Служебные маршруты
app.get("/", (req, res) => res.send("Express работает!"));
app.get("/api/info", (req, res) => res.json({
    application: "Web Technologies",
    technology: "Node.js + Express",
    database: "PostgreSQL"
}));

app.post("/api/test", (req, res) => {
    res.json({ message: "Данные получены", data: req.body });
});

app.get("/api/db-test", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW() AS current_time");
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: "Ошибка подключения к базе данных" });
    }
});

// CRUD
const cars = express.Router();

// GET /api/cars
cars.get("/", async (req, res) => {
    try {
        const result = await pool.query(`SELECT ${CAR_COLUMNS} FROM "Cars" ORDER BY "Id"`);
        res.json(result.rows);
    } catch (error) {
        sendDbError(res, error, "Ошибка получения автомобилей");
    }
});

// GET /api/cars/search?name=kia
cars.get("/search", async (req, res) => {
    try {
        const name = String(req.query.name || "");
        const result = await pool.query(
            `SELECT ${CAR_COLUMNS} FROM "Cars" 
       WHERE ("Brand" || ' ' || "Model") ILIKE $1 
       ORDER BY "Id"`,
            [`%${name}%`]
        );
        res.json(result.rows);
    } catch (error) {
        sendDbError(res, error, "Ошибка поиска");
    }
});

// GET /api/cars/:id
cars.get("/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: "Некорректный ID" });

    try {
        const result = await pool.query(`SELECT ${CAR_COLUMNS} FROM "Cars" WHERE "Id" = $1`, [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: "Автомобиль не найден" });
        res.json(result.rows[0]);
    } catch (error) {
        sendDbError(res, error, "Ошибка получения автомобиля");
    }
});

// POST /api/cars
cars.post("/", async (req, res) => {
    const errors = validateCar(req.body);
    if (errors.length > 0) return res.status(400).json({ error: "Некорректные данные", details: errors });

    try {
        const { brand, model, year, category, transmission, fuelType, seats, dailyPrice, isAvailable, description, color } = req.body;
        const result = await pool.query(
            `INSERT INTO "Cars" 
        ("Brand", "Model", "Year", "Category", "Transmission", "FuelType", "Seats", "DailyPrice", "IsAvailable", "Description", "Color")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING ${CAR_COLUMNS}`,
            [brand, model, year, category, transmission, fuelType, seats, dailyPrice, isAvailable, description || null, color || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        sendDbError(res, error, "Ошибка создания автомобиля");
    }
});

// PUT /api/cars/:id
cars.put("/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: "Некорректный ID" });

    const errors = validateCar(req.body);
    if (errors.length > 0) return res.status(400).json({ error: "Некорректные данные", details: errors });

    try {
        const { brand, model, year, category, transmission, fuelType, seats, dailyPrice, isAvailable, description, color } = req.body;
        const result = await pool.query(
            `UPDATE "Cars" SET 
        "Brand" = $1, "Model" = $2, "Year" = $3, "Category" = $4, "Transmission" = $5,
        "FuelType" = $6, "Seats" = $7, "DailyPrice" = $8, "IsAvailable" = $9,
        "Description" = $10, "Color" = $11
       WHERE "Id" = $12
       RETURNING ${CAR_COLUMNS}`,
            [brand, model, year, category, transmission, fuelType, seats, dailyPrice, isAvailable, description || null, color || null, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: "Автомобиль не найден" });
        res.json(result.rows[0]);
    } catch (error) {
        sendDbError(res, error, "Ошибка изменения автомобиля");
    }
});

// DELETE /api/cars/:id
cars.delete("/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: "Некорректный ID" });

    try {
        const result = await pool.query(`DELETE FROM "Cars" WHERE "Id" = $1 RETURNING ${CAR_COLUMNS}`, [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: "Автомобиль не найден" });
        res.json({ message: "Автомобиль удалён", car: result.rows[0] });
    } catch (error) {
        sendDbError(res, error, "Ошибка удаления автомобиля");
    }
});

app.use("/api/cars", cars);
app.use("/api/products", cars); // Дублируем по методичке

// Обработка 404
app.use((req, res) => {
    res.status(404).json({ error: "Маршрут не найден" });
});

// Обработка ошибок middleware
app.use((err, req, res, next) => {
    if (err.type === "entity.parse.failed") {
        return res.status(400).json({ error: "Некорректный JSON" });
    }
    console.error(err);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
});

app.listen(port, "0.0.0.0", () => {
    console.log(`Server started on port ${port}`);
});