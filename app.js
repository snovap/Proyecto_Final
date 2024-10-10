// Importamos las librerías necesarias
const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt'); 

// Creamos la aplicación de Express
const app = express();

// Middleware para manejar datos en formato JSON y datos enviados a través de formularios
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuramos la carpeta pública para servir archivos estáticos (CSS, imágenes, JS frontend)
app.use(express.static(path.join(__dirname, 'public')));

// Rutas de la aplicación (Aquí se agregarán más rutas después)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html')); // Ruta para el archivo index.html
});

// Configuramos el puerto en el que correrá el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`El servidor está corriendo en http://localhost:${PORT}`);
});

// Importamos el paquete de MySQL
const mysql = require('mysql2');

// Configuramos la conexión a la base de datos MySQL
const db = mysql.createConnection({
    host: 'localhost',    // Cambia esto si tu base de datos está en otro servidor
    user: 'root',         // Usuario de la base de datos
    password: 'NOVa2901', // Contraseña del usuario de la base de datos
    database: 'spgmeta'   // Nombre de la base de datos
});

// Establecemos la conexión con la base de datos
db.connect((err) => {
    if (err) {
        console.error('Error al conectar a la base de datos:', err);
    } else {
        console.log('Conexión a la base de datos MySQL establecida.');
    }
});


// Ruta para procesar el registro de un nuevo usuario
app.post('/validar', async (req, res) => {
    const { name, email, contrasena } = req.body; // Obtenemos los datos del formulario

    try {
        // Encriptar la contraseña antes de guardarla
        const hashedPassword = await bcrypt.hash(contrasena, 10);
        console.log('Contraseña encriptada:', hashedPassword); // Log para verificar el hash

        // Verificar si el correo ya existe en la base de datos
        const buscarQuery = "SELECT * FROM usuarios WHERE email = ?";
        db.query(buscarQuery, [email], (err, rows) => {
            if (err) {
                console.error('Error al buscar el correo:', err);
                return res.status(500).send('Error en el servidor');
            }

            if (rows.length > 0) {
                // Si el correo ya está registrado
                console.log('Ya existe una cuenta con este correo.');
                return res.status(400).send('El correo ya está registrado.');
            }

            // Si el correo no está registrado, insertamos el nuevo usuario
            const registrarQuery = "INSERT INTO usuarios (nombre, email, contrasena) VALUES (?, ?, ?)";
            db.query(registrarQuery, [name, email, hashedPassword], (err, result) => {
                if (err) {
                    console.error('Error al registrar el usuario:', err);
                    return res.status(500).send('Error en el servidor al registrar el usuario');
                }

                // Registro exitoso, redirigir al index.html
                console.log('Usuario registrado exitosamente.');
                return res.redirect('/');  // Redirigimos al usuario a la página de inicio
            });
        });
    } catch (error) {
        console.error('Error al encriptar la contraseña:', error);
        res.status(500).send('Error en el servidor');
    }
});

// Ruta para procesar el ingreso de un usuario
app.post('/ingresar', (req, res) => {
    const { email, contrasena } = req.body; // Obtenemos los datos del formulario

    // Verificamos si el usuario existe en la base de datos
    const buscarQuery = "SELECT * FROM usuarios WHERE email = ?";
    db.query(buscarQuery, [email], async (err, rows) => {
        if (err) {
            console.error('Error al buscar el usuario:', err);
            return res.status(500).send('Error en el servidor');
        }

        if (rows.length === 0) {
            // Si el correo no existe en la base de datos
            console.log('No existe una cuenta con este correo.');
            // Guardamos un registro de intento fallido
            guardarRegistro(null, email, 'Fallido');
            return res.status(400).send('Correo o contraseña incorrectos.');
        }

        // Si el correo existe, obtenemos el usuario
        const usuario = rows[0];
        console.log('Usuario encontrado:', usuario);

        try {
            console.log('Contraseña ingresada:', contrasena); // Log para verificar la contraseña ingresada
            // Comparamos la contraseña encriptada con la ingresada
            const esContrasenaValida = await bcrypt.compare(contrasena, usuario.contrasena);

            if (!esContrasenaValida) {
                // Si la contraseña no es correcta
                console.log('Contraseña incorrecta.');
                // Guardamos un registro de intento fallido
                guardarRegistro(usuario.ID_usuario, email, 'Fallido');
                return res.status(400).send('Correo o contraseña incorrectos.');
            }

            // Si el correo y la contraseña son correctos
            console.log('Inicio de sesión exitoso para el usuario:', usuario.nombre);
            // Guardamos un registro de intento exitoso
            guardarRegistro(usuario.ID_usuario, email, 'Exitoso');
            return res.redirect('/');  // Redirigimos al usuario a la página de inicio
        } catch (error) {
            console.error('Error al comparar la contraseña:', error);
            return res.status(500).send('Error en el servidor');
        }
    });
});

// Función para guardar el registro de inicio de sesión
function guardarRegistro(idUsuario, usuario, resultado) {
    const registrarQuery = "INSERT INTO registro (ID_usuario, usuario, contrasena, fecha_registro) VALUES (?, ?, ?, NOW())";
    // Aquí la contraseña se guarda como 'Fallido' o 'Exitoso' dependiendo del resultado
    const contrasenaGuardada = resultado === 'Exitoso' ? 'Contraseña validada' : 'Fallido';

    db.query(registrarQuery, [idUsuario, usuario, contrasenaGuardada], (err) => {
        if (err) {
            console.error('Error al registrar intento de inicio de sesión:', err);
        } else {
            console.log('Intento de inicio de sesión registrado correctamente.');
        }
    });
}






