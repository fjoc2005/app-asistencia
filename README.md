# APP Asistencia

Sistema moderno de registro de asistencia con panel de administración.

## 🚀 Características

- ✅ Registro rápido de asistencia mediante RUT
- 👥 Panel de administración completo
- 📊 Dashboard con estadísticas en tiempo real
- 📁 Importación masiva de usuarios (CSV)
- 🎨 Diseño moderno y responsivo (móvil, tablet, escritorio)
- ✨ Animaciones suaves y feedback visual
- 🔐 Autenticación de administrador

## 📱 Uso

### Para Asistentes

1. Abrir `index.html`
2. Hacer clic en "INGRESAR ASISTENTE"
3. Ingresar RUT (formato: 12.345.678-9)
4. Confirmar asistencia

### Para Administradores

1. Abrir `index.html`
2. Hacer clic en "Acceso Administrador"
3. Iniciar sesión con:
   - **Email:** administracion@gmail.com
   - **Contraseña:** demo123
4. Gestionar usuarios y ver estadísticas

## 🛠️ Instalación

1. Descargar todos los archivos en una carpeta
2. Abrir `index.html` en un navegador moderno
3. ¡Listo para usar!

## 📋 Estructura de Archivos

```
APP asistencia/
├── index.html              # Página principal
├── admin-login.html        # Login de administrador
├── admin.html              # Panel de administración
├── registro.html           # Registro de asistencia
├── styles.css              # Estilos y diseño
├── app.js                  # Lógica de registro
├── admin.js                # Lógica de administración
└── README.md               # Este archivo
```

## 👥 Gestión de Usuarios

### Agregar Usuario Individual

1. Ir a "Usuarios" en el panel admin
2. Clic en "Nuevo Usuario"
3. Completar formulario
4. Guardar

### Importación Masiva (CSV)

1. Ir a "Importar Datos"
2. Preparar archivo CSV con formato:
   ```
   RUT,Nombre,Email,Estado
   12345678-9,Juan Pérez,juan@email.com,Activo
   98765432-1,María González,maria@email.com,Activo
   ```
3. Arrastrar archivo o seleccionar
4. Los usuarios se importarán automáticamente

## 🎨 Diseño

- **Colores:** Paleta vibrante y alegre (azul, púrpura, verde, naranja)
- **Tipografía:** Poppins (Google Fonts)
- **Animaciones:** Transiciones suaves y micro-interacciones
- **Responsive:** Optimizado para móvil, tablet y escritorio

## 💾 Almacenamiento

Los datos se guardan en **localStorage** del navegador:
- `usuarios`: Lista de usuarios registrados
- `asistencias`: Registro de asistencias

### Datos de Demostración

El sistema incluye 3 usuarios de prueba:
- María González (12.345.678-5)
- Juan Pérez (98.765.432-1)
- Ana Silva (11.222.333-4)

## 🔧 Funcionalidades Técnicas

### Validación de RUT

- Formato automático mientras se escribe
- Validación de dígito verificador
- Verificación de existencia en base de datos

### Panel de Administración

- **Dashboard:** Estadísticas en tiempo real
- **Usuarios:** CRUD completo
- **Asistencias:** Visualización y filtrado
- **Importar:** Carga masiva desde CSV

## 📱 Deployment para Android

### Opción 1: Progressive Web App (PWA)

1. Abrir en Chrome Android
2. Menú → "Agregar a pantalla de inicio"
3. La app se instalará como aplicación nativa

### Opción 2: Capacitor (Nativo)

```bash
npm install @capacitor/core @capacitor/cli
npx cap init
npx cap add android
npx cap open android
```

## 🔮 Futuras Mejoras

- [ ] Integración con Google Sheets API
- [ ] Notificaciones push
- [ ] Exportación de reportes PDF
- [ ] Gráficos de asistencia
- [ ] Modo offline completo
- [ ] Reconocimiento facial
- [ ] Códigos QR para registro

## 📞 Soporte

Para consultas o problemas, contactar al administrador del sistema.

---

**Versión:** 1.0.0  
**Última actualización:** Diciembre 2025
