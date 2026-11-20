# wt-lab10-10express-kleshchenok

Лабораторная работа № 10 «Web-технологии»: REST API на Node.js + Express с подключением PostgreSQL
(таблица `Cars` из WT-8 — прокат автомобилей).

## Запуск локально

```powershell
npm install
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/wt_lab8"
npm start            # http://localhost:3000
```

## API

| Метод | URL | Назначение |
|-------|-----|-----------|
| GET | `/` | информация о сервере |
| GET | `/api/info` | информация о приложении |
| GET | `/api/db-test` | проверка подключения к БД |
| GET | `/api/cars` (`/api/products`) | список автомобилей |
| GET | `/api/cars/:id` | один автомобиль |
| GET | `/api/cars/search?name=kia` | поиск по марке и модели |
| POST | `/api/cars` | создать |
| PUT | `/api/cars/:id` | изменить |
| DELETE | `/api/cars/:id` | удалить |
| любой другой | — | 404 `{"error":"Маршрут не найден"}` |

Строка подключения к базе берётся из переменной окружения `DATABASE_URL`, в репозиторий она не попадает.
