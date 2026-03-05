# 📊 Base de Datos de Personajes - Congregación Modelo

Aplicación web para gestión de base de datos de personajes.

## 🚀 Cómo Iniciar la Aplicación

Sigue estos sencillos pasos para correr la aplicación en tu computadora:

### 1. Requisitos Previos

Asegúrate de tener instalado **Node.js**:
- [Descargar Node.js](https://nodejs.org/) (versión LTS recomendada)

### 2. Iniciar el Servidor

Abre una terminal en la carpeta del proyecto y ejecuta:

```bash
# 1. Instalar las dependencias (solo la primera vez)
npm install

# 2. Iniciar la aplicación
npm run dev
```

La aplicación estará disponible en: [http://localhost:3000](http://localhost:3000)

> **Nota:** Al abrir la aplicación, se te solicitará la contraseña.

### 3. Detener la Aplicación

Para detener el servidor, ve a la terminal donde se está ejecutando y presiona:

`Ctrl + C`

Luego confirma con `S` o `Y` si se te solicita.

---

## 🔑 Configuración de Contraseñas

### ¿Dónde cambiar la contraseña?

La contraseña maestra y de acceso se encuentra en el siguiente archivo:

📂 `src/lib/config.ts`

Busca la línea:
```typescript
export const ADMIN_PASSWORD = '1234';
```
Cambia `'1234'` por la contraseña que desees.

### Comandos Útiles

- **Instalar:** `npm install`
- **Actualizar base de datos:** `npx prisma db push` (si haces cambios en el esquema)

¡Listo!
