# Guía de Migración a Nueva Cuenta de Supabase

Este documento describe los pasos para replicar la estructura de la base de datos de "APP Aldase Tech" en un nuevo proyecto de Supabase.

## Prerrequisitos

1.  Una cuenta en [Supabase](https://supabase.com/).
2.  Un nuevo proyecto creado en Supabase.

## Pasos para la Migración

### 1. Acceder al SQL Editor
1.  Entra en tu nuevo proyecto en Supabase.
2.  En el menú lateral izquierdo, haz clic en el icono **SQL Editor** (parece una hoja de código).
3.  Haz clic en **New query** (Nueva consulta).

### 2. Ejecutar el Script de Migración
1.  Abre el archivo `migrations/full_schema_replication.sql` que se ha generado en tu proyecto local.
2.  Copia **todo** el contenido del archivo.
3.  Pégalo en el editor de consultas de Supabase.
4.  Haz clic en el botón **Run** (Ejecutar) en la parte inferior derecha del editor.

### 3. Verificar la Creación
1.  Una vez ejecutado, deberías ver un mensaje de "Success".
2.  Ve al **Table Editor** (icono de tabla en el menú izquierdo).
3.  Deberías ver todas las tablas creadas (`projects`, `clients`, `workers`, etc.).

### 4. Importar los Datos Existentes (Opcional)
Si deseas restaurar los datos que tenías (Clientes, Proyectos, Facturas, etc.), sigue estos pasos después de crear las tablas:

1.  Abre el archivo `migrations/full_data_export.sql` de tu proyecto.
2.  Copia todo su contenido.
3.  Pégalo en el **SQL Editor** de Supabase (puedes crear una "New query" o limpiar la anterior).
4.  Ejecuta el script.

### 5. Configurar la Conexión en la App
Para que tu aplicación local apunte a este nuevo proyecto:

1.  Ve a los **Settings** (Configuración) de tu proyecto en Supabase -> **API**.
2.  Copia la `Project URL` y la `anon public` Key.
3.  En tu código local, abre el archivo `.env`.
4.  Actualiza las variables:
    ```env
    VITE_SUPABASE_URL=tu_nueva_project_url
    VITE_SUPABASE_ANON_KEY=tu_nueva_anon_key
    ```
5.  Reinicia la aplicación (`npm run dev`) para que los cambios surtan efecto.

## Notas Adicionales
- **Datos:** Este script solo replica la **estructura** (tablas y columnas). No copia los datos existentes (clientes, proyectos, etc.), excepto una configuración de empresa básica vacía.
- **Storage:** Si tu aplicación usa Supabase Storage (para subir PDFs o imágenes), necesitarás crear los "Buckets" manualmente en la sección **Storage** de Supabase y configurar las políticas de acceso (Policies) para permitir lectura/escritura pública o autenticada según necesites.

¡Listo! Tu nuevo backend debería estar funcional.
