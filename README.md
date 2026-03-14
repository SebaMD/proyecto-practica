# proyecto-practica

Sistema web para la gestion de peticiones, inscripciones y solicitudes de renovacion de licencias de conducir.

## Requisitos

- Node.js
- PostgreSQL
- npm

## Variables de entorno

### Backend

Crear el archivo `backend/.env` con estas variables:

```env
HOST=localhost
PORT=3000
DB_PORT=5432
DB_USERNAME=tu_usuario_bd
DB_PASSWORD=tu_contrasena_bd
DATABASE=tu_base_de_datos
COOKIE_KEY=tu_cookie_key
JWT_SECRET=tu_jwt_secret
SESSION_SECRET=tu_session_secret
EMAIL_USER=tu_correo@gmail.com
EMAIL_PASS=tu_contrasena_de_aplicacion
```

Notas:
- `EMAIL_USER` y `EMAIL_PASS` se usan para el envio de correos con Nodemailer.
- `EMAIL_PASS` debe ser una contrasena de aplicacion si se usa el Gmail.

### Frontend

Crear el archivo `frontend/.env` con estas variables:

```env
VITE_BASE_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

## Instalacion

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Importante

- Los archivos `.env` no deben subirse al repositorio.
- El proyecto ya tiene reglas en `.gitignore` para evitar subir esas credenciales.
- No compartas valores reales de tu base de datos, JWT o correo.
